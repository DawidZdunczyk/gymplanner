import { spawnSync } from "node:child_process";
import { withAccessFixtures } from "./access-fixtures.mjs";
import { validateLocalInfo } from "./local-access.mjs";
import { runTrainingChecks } from "./training-checks.mjs";

try {
  const workdirArgs = process.env.SUPABASE_WORKDIR ? ["--workdir", process.env.SUPABASE_WORKDIR] : [];
  const status = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "status", "-o", "json"], {
    encoding: "utf8",
  });
  if (status.status !== 0) throw new Error("Start local Supabase before training checks");
  const info = JSON.parse(status.stdout);
  validateLocalInfo(info);
  const migration = spawnSync("npx", ["--no-install", "supabase", ...workdirArgs, "db", "push", "--local"], {
    stdio: "inherit",
  });
  if (migration.status !== 0) throw new Error("Local training migration failed");
  await withAccessFixtures(info, runTrainingChecks);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
