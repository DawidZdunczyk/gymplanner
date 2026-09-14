import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { withAccessFixtures } from "./access-fixtures.mjs";
import { runDatabaseChecks } from "./access-checks.mjs";

export function validateLocalInfo(info) {
  const url = new URL(info.API_URL);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Access fixture runner requires a local loopback Supabase URL");
  }
  if (!info.ANON_KEY || !info.SERVICE_ROLE_KEY) throw new Error("Local Supabase keys unavailable");
}

export async function validateEnvironment(info, read = readFile) {
  validateLocalInfo(info);
  const expected = { SUPABASE_URL: info.API_URL, SUPABASE_KEY: info.ANON_KEY, ALLOW_SIGNUP: "false" };
  for (const path of [".dev.vars", ".env", ".env.local", ".env.production", ".env.production.local"]) {
    let contents;
    try {
      contents = await read(path, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const env = parseEnv(contents);
    for (const [key, value] of Object.entries(expected)) {
      if (env[key] !== undefined && env[key] !== value)
        throw new Error(`${path} overrides ${key}; access checks stopped before writes`);
    }
  }
}

export async function runLocalAccess() {
  const workdirArgs = process.env.SUPABASE_WORKDIR ? ["--workdir", process.env.SUPABASE_WORKDIR] : [];
  const status = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "status", "-o", "json"], {
    encoding: "utf8",
  });
  if (status.status !== 0) throw new Error("Start local Supabase before access checks");
  const info = JSON.parse(status.stdout);
  await validateEnvironment(info);
  const migration = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "db", "push", "--local"], {
    stdio: "inherit",
  });
  if (migration.status !== 0) throw new Error("Local migration failed");
  await withAccessFixtures(info, runDatabaseChecks);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await runLocalAccess();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
