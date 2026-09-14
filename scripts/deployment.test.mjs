import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile, readdir, rm, mkdir, mkdtemp, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { join } from "node:path";
import { readDeploymentConfig, validatePublicKey } from "./deployment-config.mjs";
import { readSmokeConfig } from "./smoke.mjs";
import { prepareCiSupabase } from "./prepare-ci-supabase.mjs";
import { waitForWorker } from "./worker-readiness.mjs";

const env = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "test-token",
  STAGING_URL: "https://gymplanner-staging.example.workers.dev",
  PRODUCTION_URL: "https://gymplanner.example.workers.dev",
  STAGING_SUPABASE_URL: "https://stage.supabase.co",
  PRODUCTION_SUPABASE_URL: "https://prod.supabase.co",
  STAGING_SUPABASE_KEY: "sb_publishable_stage",
  PRODUCTION_SUPABASE_KEY: "sb_publishable_prod",
  STAGING_SMOKE_EMAIL: "stage@example.com",
  STAGING_SMOKE_PASSWORD: "stage-test",
  PRODUCTION_SMOKE_EMAIL: "prod@example.com",
  PRODUCTION_SMOKE_PASSWORD: "prod-test",
};

test("each deployment selects only its own database and account", () => {
  const stage = readDeploymentConfig("staging", env);
  const prod = readDeploymentConfig("production", env);
  assert.equal(stage.supabaseUrl, env.STAGING_SUPABASE_URL);
  assert.equal(prod.supabaseKey, env.PRODUCTION_SUPABASE_KEY);
  assert.equal(stage.smokeEmail, env.STAGING_SMOKE_EMAIL);
  assert.equal(prod.worker, "gymplanner");
});
test("reject shared database, wrong Worker and implicit target before deployment", () => {
  assert.throws(
    () => readDeploymentConfig("staging", { ...env, STAGING_SUPABASE_URL: env.PRODUCTION_SUPABASE_URL }),
    /different Supabase/,
  );
  assert.throws(() => readDeploymentConfig("production", { ...env, PRODUCTION_URL: env.STAGING_URL }), /Worker URLs/);
  assert.throws(() => readDeploymentConfig(undefined, env), /explicitly/);
});
test("reject admin keys and accept legacy anon keys", () => {
  const jwt = (role) => `e30.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assert.throws(() => validatePublicKey(jwt("service_role")), /admin keys/);
  assert.throws(() => validatePublicKey("sb_secret_private"), /admin keys/);
  assert.throws(() => validatePublicKey("garbage"), /admin keys/);
  assert.doesNotThrow(() => validatePublicKey(jwt("anon")));
});
test("reject credentials in URL and missing smoke password", () => {
  assert.throws(
    () => readDeploymentConfig("staging", { ...env, STAGING_SUPABASE_URL: "https://secret@stage.supabase.co" }),
    /HTTPS origin/,
  );
  assert.throws(
    () => readDeploymentConfig("production", { ...env, PRODUCTION_SMOKE_PASSWORD: "" }),
    /PRODUCTION_SMOKE_PASSWORD/,
  );
});
test("signup cannot run against hosted app or local app backed by hosted database", () => {
  assert.throws(
    () => readSmokeConfig({ SMOKE_MODE: "signup", BASE_URL: env.STAGING_URL, SUPABASE_URL: "http://127.0.0.1:54321" }),
    /loopback/,
  );
  assert.throws(() => readSmokeConfig({ SMOKE_MODE: "signup", SUPABASE_URL: env.PRODUCTION_SUPABASE_URL }), /loopback/);
  assert.doesNotThrow(() => readSmokeConfig({ SMOKE_MODE: "signup", SUPABASE_URL: "http://127.0.0.1:54321" }));
});
test("hosted smoke defaults to prepared accounts and requires HTTPS", () => {
  assert.throws(() => readSmokeConfig({ BASE_URL: env.PRODUCTION_URL }), /SMOKE_EMAIL/);
  assert.throws(() => readSmokeConfig({ BASE_URL: "http://example.com" }), /HTTPS/);
  const config = readSmokeConfig({
    BASE_URL: env.PRODUCTION_URL,
    SMOKE_EMAIL: "test@example.com",
    SMOKE_PASSWORD: "test",
  });
  assert.equal(config.mode, "existing");
});

test("CI skips occupied ports and isolates project identity without changing developer config", async (t) => {
  const original = await readFile("supabase/config.toml", "utf8");
  const occupied = createServer();
  await new Promise((resolve, reject) => {
    occupied.once("error", (error) => (error.code === "EADDRINUSE" ? resolve() : reject(error)));
    occupied.listen(15420, "0.0.0.0", resolve);
  });
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  const first = await prepareCiSupabase();
  t.after(() => rm(first.workdir, { recursive: true, force: true }));
  const second = await prepareCiSupabase();
  t.after(() => rm(second.workdir, { recursive: true, force: true }));
  assert.notEqual(first.project, second.project);
  assert.notEqual(first.workdir, second.workdir);
  assert.ok(first.ports.every((port) => port > 15420 && port < 25000));
  assert.equal(new Set(first.ports).size, first.ports.length);
  const config = await readFile(join(first.workdir, "supabase/config.toml"), "utf8");
  assert.ok(config.includes(`project_id = "${first.project}"`));
  assert.doesNotMatch(config, /^port = 54322$/m);
  assert.equal(await readFile("supabase/config.toml", "utf8"), original);
});

test("CI copies only regular SQL migrations and disables unused seed", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "gymplanner-ci-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "supabase/migrations"), { recursive: true });
  await mkdir(join(root, "supabase/admin"));
  const source = await readFile("supabase/config.toml", "utf8");
  await writeFile(join(root, "supabase/config.toml"), source);
  const migration = "20260914180000_assigned_trainee_access.sql";
  const sql = await readFile(join("supabase/migrations", migration), "utf8");
  await writeFile(join(root, "supabase/migrations", migration), sql);
  await writeFile(join(root, "supabase/migrations/.env"), "DO_NOT_COPY=test");
  await writeFile(join(root, "supabase/admin/operator.sql"), "DO_NOT_COPY");
  await symlink(join(root, "supabase/admin/operator.sql"), join(root, "supabase/migrations/20260914180001_link.sql"));
  const prepared = await prepareCiSupabase(root);
  t.after(() => rm(prepared.workdir, { recursive: true, force: true }));
  assert.deepEqual((await readdir(join(prepared.workdir, "supabase"))).sort(), ["config.toml", "migrations"]);
  assert.deepEqual(await readdir(join(prepared.workdir, "supabase/migrations")), [migration]);
  assert.equal(await readFile(join(prepared.workdir, "supabase/migrations", migration), "utf8"), sql);
  assert.match(
    await readFile(join(prepared.workdir, "supabase/config.toml"), "utf8"),
    /\[db\.seed\][\s\S]*?enabled = false/,
  );
  assert.equal(await readFile(join(root, "supabase/config.toml"), "utf8"), source);
});

test("readiness waits through network and edge errors using anonymous GET only", async () => {
  let clock = 0;
  const replies = [new Error("network"), 404, 523, 200];
  let calls = 0;
  await waitForWorker(env.STAGING_URL, {
    timeoutMs: 100,
    intervalMs: 10,
    now: () => clock,
    pause: async (ms) => {
      clock += ms;
    },
    log: () => {
      /* Suppress expected retry messages in tests. */
    },
    request: async (url, options) => {
      assert.equal(url, env.STAGING_URL);
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "manual");
      assert.equal(options.body, undefined);
      assert.equal(options.headers.Authorization, undefined);
      const reply = replies[calls++];
      if (reply instanceof Error) throw reply;
      return { status: reply };
    },
  });
  assert.equal(calls, 4);
  assert.equal(clock, 30);
});

test("readiness fails on persistent 404 within its deadline", async () => {
  let clock = 0;
  let calls = 0;
  await assert.rejects(
    waitForWorker(env.STAGING_URL, {
      timeoutMs: 30,
      intervalMs: 10,
      now: () => clock,
      pause: async (ms) => {
        clock += ms;
      },
      log: () => {
        /* Suppress expected retry messages in tests. */
      },
      request: async () => {
        calls++;
        return { status: 404 };
      },
    }),
    /not ready.*HTTP 404/,
  );
  assert.equal(calls, 3);
  assert.equal(clock, 30);
});

test("readiness does not retry auth failures, redirects or application errors", async () => {
  for (const status of [302, 401, 403, 500]) {
    let calls = 0;
    await assert.rejects(
      waitForWorker(env.STAGING_URL, {
        log: () => {
          /* Suppress expected retry messages in tests. */
        },
        request: async () => {
          calls++;
          return { status };
        },
        pause: async () => assert.fail("Unexpected retry"),
      }),
      new RegExp(`readiness failed: HTTP ${status}`),
    );
    assert.equal(calls, 1);
  }
});
