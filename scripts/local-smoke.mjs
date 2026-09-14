import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { readSmokeConfig, runSmoke } from "./smoke.mjs";

// Supabase must already be running. Capture credentials in memory, never print them.
const workdirArgs = process.env.SUPABASE_WORKDIR ? ["--workdir", process.env.SUPABASE_WORKDIR] : [];
const status = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "status", "-o", "json"], {
  encoding: "utf8",
});
if (status.status !== 0) throw new Error("Start local Supabase before running smoke:local");
const info = JSON.parse(status.stdout);
const supabaseUrl = info.API_URL;
const supabaseKey = info.ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error("Local Supabase did not return API_URL and ANON_KEY");
const env = {
  ...process.env,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_KEY: supabaseKey,
  ALLOW_SIGNUP: "true",
  SMOKE_MODE: "signup",
  BASE_URL: "http://127.0.0.1:4321",
  SITE_URL: "http://127.0.0.1:4321",
  CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
};
delete env.CLOUDFLARE_ENV;
// Read config before doing anything that could create an account.
const config = readSmokeConfig(env);
// A local env file can override process variables in workerd. Reject mismatched
// settings instead of accidentally creating a user in a hosted project.
for (const path of [".dev.vars", ".env", ".env.local", ".env.production", ".env.production.local"]) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  const fileEnv = parseEnv(content);
  for (const key of ["SUPABASE_URL", "SUPABASE_KEY", "ALLOW_SIGNUP"]) {
    if (fileEnv[key] !== undefined && fileEnv[key] !== env[key]) {
      throw new Error(`${path} overrides ${key}; use matching local smoke settings or move the file aside`);
    }
  }
}
const portCheck = createServer();
await new Promise((resolve, reject) => {
  portCheck.once("error", () => reject(new Error("Port 4321 is occupied; stop the existing app before local smoke")));
  portCheck.listen(4321, "127.0.0.1", resolve);
});
await new Promise((resolve) => portCheck.close(resolve));
for (const mode of ["signup", "existing"]) {
  env.ALLOW_SIGNUP = mode === "signup" ? "true" : "false";
  console.log(`Local smoke mode: ${mode}`);
  let started = false;
  let stopFailed = false;
  try {
    const build = spawnSync("npm", ["run", "build"], { env, stdio: "inherit" });
    if (build.status !== 0) throw new Error("Local smoke build failed");
    const start = spawnSync("npm", ["run", "preview", "--", "--background", "--host", "127.0.0.1", "--port", "4321"], {
      env,
      stdio: "inherit",
    });
    if (start.status !== 0) throw new Error("Preview failed to start");
    started = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(config.origin, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for workerd to start. */
      }
      await delay(1000);
    }
    if (!ready) throw new Error("Preview did not become ready");
    await runSmoke({ ...config, mode });
  } finally {
    if (started) {
      const stop = spawnSync("npx", ["--no-install", "astro", "preview", "stop"], { env, stdio: "inherit" });
      stopFailed = stop.status !== 0;
    }
  }
  if (stopFailed) throw new Error("Could not stop the local preview server");
}
