import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, appendFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDeploymentConfig } from "./deployment-config.mjs";
import { runSmoke } from "./smoke.mjs";
import { waitForWorker } from "./worker-readiness.mjs";

function run(command, args, env) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? "could not start"})`);
}

const target = process.argv[2];
let config,
  directory,
  previous,
  previousUrlEnabled = false,
  deployed = false;
const report = { target, status: "failed" };

async function api(path, { method = "GET", body, allowMissing = false } = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account}${path}`, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 404 && allowMissing) return null;
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(`Cloudflare ${method} failed (HTTP ${response.status}); inspect the account permissions`);
  return data.result;
}
const scriptPath = () => `/workers/scripts/${config.worker}`;
async function currentVersion() {
  const result = await api(`${scriptPath()}/deployments`, { allowMissing: true });
  if (!result) return null;
  const deployment = result.deployments?.[0];
  if (!deployment || deployment.versions?.length !== 1 || deployment.versions[0].percentage !== 100) {
    throw new Error("Existing Worker has no unambiguous 100% deployment; refusing to overwrite it");
  }
  const version = await api(`${scriptPath()}/versions/${deployment.versions[0].version_id}`);
  if (!version.annotations?.["workers/tag"]?.startsWith("gymplanner-")) {
    throw new Error("Worker name is already in use by an unmanaged deployment; refusing to overwrite it");
  }
  return version.id;
}
async function smoke() {
  await waitForWorker(config.site);
  return runSmoke({ origin: config.site, mode: "existing", email: config.smokeEmail, password: config.smokePassword });
}
function rollback(version) {
  run("npx", ["--no-install", "wrangler", "rollback", version, "--name", config.worker, "--yes"], process.env);
}

try {
  config = readDeploymentConfig(target);
  const sha = process.env.GITHUB_SHA ?? spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout?.trim();
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("A full Git commit SHA is required");
  const dirty = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  if (dirty.status !== 0 || dirty.stdout.trim())
    throw new Error("Commit all reviewed project changes before deployment");
  if (
    process.env.GITHUB_ACTIONS &&
    (process.env.GITHUB_REF !== "refs/heads/main" ||
      !["push", "workflow_dispatch"].includes(process.env.GITHUB_EVENT_NAME))
  ) {
    throw new Error("Deployment is allowed only for push or manual runs on main");
  }
  const subdomain = await api("/workers/subdomain");
  if (subdomain.subdomain !== config.subdomain)
    throw new Error("Worker URLs do not belong to the selected Cloudflare account");
  previous = await currentVersion();
  if (previous) {
    const route = await api(`${scriptPath()}/subdomain`);
    if (typeof route.enabled !== "boolean") throw new Error("Cloudflare returned no Worker URL state");
    previousUrlEnabled = route.enabled;
  }
  Object.assign(report, {
    sha,
    url: config.site,
    worker: config.worker,
    previousVersion: previous,
    previousUrlEnabled,
  });

  const buildEnv = { ...process.env, CLOUDFLARE_ENV: target, SITE_URL: config.site, ALLOW_SIGNUP: "false" };
  // No database credentials are required for a server build; runtime receives secrets separately.
  delete buildEnv.SUPABASE_URL;
  delete buildEnv.SUPABASE_KEY;
  run("npm", ["run", "build"], buildEnv);
  const built = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
  if (
    built.name !== config.worker ||
    built.vars?.ALLOW_SIGNUP !== false ||
    built.images ||
    built.kv_namespaces?.length ||
    built.assets?.not_found_handling === "404-page"
  ) {
    throw new Error("Built Worker has an unexpected target, signup policy or unused paid bindings");
  }
  directory = await mkdtemp(join(tmpdir(), "gymplanner-deploy-"));
  const secretFile = join(directory, "secrets.json");
  await writeFile(secretFile, JSON.stringify({ SUPABASE_URL: config.supabaseUrl, SUPABASE_KEY: config.supabaseKey }), {
    mode: 0o600,
  });
  const publish = (suffix = "") =>
    run(
      "npx",
      ["--no-install", "wrangler", "deploy", "--secrets-file", secretFile, "--tag", `gymplanner-${sha}${suffix}`],
      buildEnv,
    );
  deployed = true;
  publish();
  const version = await currentVersion();
  if (!version) throw new Error("Cloudflare did not return a deployed version");
  report.publishedVersion = version;
  await smoke();
  report.version = version;
  // On the first staging release prove rollback before production: create a second
  // version of the same tested artifact, then restore the known-good first version.
  if (target === "staging" && !previousUrlEnabled) {
    publish("-check");
    if ((await currentVersion()) === version) throw new Error("Staging rehearsal did not create a distinct version");
    rollback(version);
    if ((await currentVersion()) !== version) throw new Error("Staging rollback did not restore the verified version");
    await smoke();
    report.rollbackRehearsal = "passed";
  }
  report.status = "passed";
  console.log(`Verified ${target}: ${config.site} (version ${version})`);
} catch (error) {
  console.error(error.message);
  report.error = error.message;
  process.exitCode = 1;
  if (deployed) {
    try {
      const active = await currentVersion();
      if (active && (active !== previous || !previousUrlEnabled)) {
        if (previous && previousUrlEnabled) {
          rollback(previous);
          await smoke();
          report.recovery = "previous version restored and smoke passed";
        } else {
          await api(`${scriptPath()}/subdomain`, { method: "POST", body: { enabled: false, previews_enabled: false } });
          report.recovery = "unverified deployment URL disabled; Worker and database preserved";
        }
      } else {
        report.recovery = "no new active version; previous deployment preserved";
      }
    } catch {
      report.recovery = "automatic recovery failed; manual intervention required";
      console.error(report.recovery);
    }
  }
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
  if (config) {
    await mkdir("test-results", { recursive: true });
    await writeFile(`test-results/deployment-${target}.json`, JSON.stringify(report, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `\nDeployment ${target}: **${report.status}**\n\nURL: ${report.url ?? "not published"}\n\nSHA: ${report.sha ?? "not deployed"}\n\nPublished version: ${report.publishedVersion ?? "not published"}\n\nVerified version: ${report.version ?? "not verified"}\n\nError: ${report.error ?? "none"}\n\nRecovery: ${report.recovery ?? "not needed"}\n`,
      );
    }
  }
}
