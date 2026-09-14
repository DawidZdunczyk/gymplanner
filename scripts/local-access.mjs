import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { withAccessFixtures } from "./access-fixtures.mjs";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { runHttpChecks } from "./access-http.mjs";
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
  const dbOnly = process.argv.includes("--db-only");
  if (!dbOnly) {
    const port = createServer();
    await new Promise((resolve, reject) => {
      port.once("error", () => reject(new Error("Port 4321 is occupied; stop the existing app before access checks")));
      port.listen(4321, "127.0.0.1", resolve);
    });
    await new Promise((resolve) => port.close(resolve));
  }
  await withAccessFixtures(info, async (fixture) => {
    await runDatabaseChecks(fixture);
    if (dbOnly) return;
    const origin = "http://127.0.0.1:4321";
    // Only OS/tool essentials enter the child. Admin credentials stay in this process.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => ["PATH", "HOME", "TMPDIR", "USER", "CI"].includes(key)),
    );
    Object.assign(env, {
      SUPABASE_URL: info.API_URL,
      SUPABASE_KEY: info.ANON_KEY,
      ALLOW_SIGNUP: "false",
      SITE_URL: origin,
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    });
    let started = false;
    try {
      if (spawnSync("npm", ["run", "build"], { env, stdio: "inherit" }).status !== 0)
        throw new Error("Access preview build failed");
      if (
        spawnSync("npm", ["run", "preview", "--", "--background", "--host", "127.0.0.1", "--port", "4321"], {
          env,
          stdio: "inherit",
        }).status !== 0
      )
        throw new Error("Access preview failed to start");
      started = true;
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        try {
          if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) {
            ready = true;
            break;
          }
        } catch {
          /* Wait for workerd. */
        }
        await delay(1000);
      }
      if (!ready) throw new Error("Access preview not ready");
      await runHttpChecks(fixture, origin);
    } finally {
      if (started) {
        const stop = spawnSync("npx", ["--no-install", "astro", "preview", "stop"], { env, stdio: "inherit" });
        if (stop.status !== 0) process.exitCode = 1;
      }
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await runLocalAccess();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
