import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { validateEnvironment, validateLocalInfo } from "./local-access.mjs";

export async function runLocalE2e() {
  const workdirArgs = process.env.SUPABASE_WORKDIR ? ["--workdir", process.env.SUPABASE_WORKDIR] : [];
  // Status contains administrative credentials: capture it in memory and never print stdout/stderr.
  const status = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "status", "-o", "json"], {
    encoding: "utf8",
  });
  if (status.status !== 0) throw new Error("Start local Supabase before E2E checks");
  let info;
  try {
    info = JSON.parse(status.stdout);
  } catch {
    throw new Error("Local Supabase returned invalid status data");
  }
  validateLocalInfo(info);
  await validateEnvironment(info);

  const port = createServer();
  await new Promise((resolve, reject) => {
    port.once("error", () => reject(new Error("Port 4321 is occupied; stop the existing app before E2E checks")));
    port.listen(4321, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => port.close(resolve));

  const migration = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "db", "push", "--local"], {
    stdio: "inherit",
  });
  if (migration.status !== 0) throw new Error("Local E2E migration failed");

  const origin = "http://127.0.0.1:4321";
  const toolEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => ["PATH", "HOME", "TMPDIR", "USER", "CI"].includes(key)),
  );
  // Public application configuration only; no privileged key reaches the build or preview.
  const appEnv = {
    ...toolEnv,
    SUPABASE_URL: info.API_URL,
    SUPABASE_KEY: info.ANON_KEY,
    ALLOW_SIGNUP: "false",
    SITE_URL: origin,
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
  };
  let started = false;
  try {
    if (spawnSync("npm", ["run", "build"], { env: appEnv, stdio: "inherit" }).status !== 0)
      throw new Error("E2E preview build failed");
    if (
      spawnSync("npm", ["run", "preview", "--", "--background", "--host", "127.0.0.1", "--port", "4321"], {
        env: appEnv,
        stdio: "inherit",
      }).status !== 0
    )
      throw new Error("E2E preview failed to start");
    started = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) {
          ready = true;
          break;
        }
      } catch {
        // Wait until workerd accepts requests.
      }
      await delay(1000);
    }
    if (!ready) throw new Error("E2E preview did not become ready");

    // Fixtures independently obtain credentials from this same isolated local project's status.
    const testEnv = {
      ...toolEnv,
      BASE_URL: origin,
      ...(process.env.SUPABASE_WORKDIR ? { SUPABASE_WORKDIR: process.env.SUPABASE_WORKDIR } : {}),
      ...(process.env.PLAYWRIGHT_BROWSERS_PATH
        ? { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH }
        : {}),
    };
    const tests = spawnSync("npx", ["--no-install", "playwright", "test", ...process.argv.slice(2)], {
      env: testEnv,
      stdio: "inherit",
    });
    if (tests.status !== 0) throw new Error("E2E browser checks failed");
  } finally {
    if (started) {
      const stop = spawnSync("npx", ["--no-install", "astro", "preview", "stop"], {
        env: appEnv,
        stdio: "inherit",
      });
      if (stop.status !== 0) {
        console.error("Could not stop the E2E preview server");
        process.exitCode = 1;
      }
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await runLocalE2e();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
