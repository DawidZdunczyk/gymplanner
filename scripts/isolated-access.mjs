import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { prepareCiSupabase } from "./prepare-ci-supabase.mjs";

// Same order as CI, on a fresh local project. Never stop the developer's project.
const { workdir, project } = await prepareCiSupabase();
const env = { ...process.env, SUPABASE_WORKDIR: workdir };
console.log(`Checking fresh local project ${project}`);
let stopped;
try {
  const start = spawnSync(
    "npx",
    [
      "--no-install",
      "supabase",
      "--workdir",
      workdir,
      "start",
      "-x",
      "studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,storage-api,postgres-meta,supavisor",
    ],
    { env, encoding: "utf8" },
  );
  // Supabase start may print keys. Keep its output in memory even on failure.
  if (start.status !== 0) throw new Error("Isolated Supabase could not start; inspect local Docker status");
  const checks = [
    "smoke:local",
    "smoke:access:local",
    ...(process.argv.includes("--training") ? ["check:training:db", "test:e2e:local"] : []),
  ];
  for (const script of checks) {
    if (spawnSync("npm", ["run", script], { env, stdio: "inherit" }).status !== 0)
      throw new Error(`${script} failed on the isolated project`);
  }
} finally {
  const stop = spawnSync("npx", ["--no-install", "supabase", "--workdir", workdir, "stop", "--no-backup"], {
    env,
    encoding: "utf8",
  });
  stopped = stop.status === 0;
  if (stopped) await rm(workdir, { recursive: true, force: true });
  else console.error(`Could not stop isolated local project ${project}; configuration retained at ${workdir}`);
}
if (!stopped) process.exitCode = 1;
