import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment, validateLocalInfo } from "./local-access.mjs";

const local = { API_URL: "http://127.0.0.1:54321", ANON_KEY: "test-public", SERVICE_ROLE_KEY: "test-admin" };
test("reject remote and ambiguous targets before reading configuration", async () => {
  for (const API_URL of [
    "https://project.supabase.co",
    "http://127.0.0.1.evil.test",
    "http://user@localhost:54321",
    "http://localhost:54321/remote",
    "file:///tmp/test",
  ]) {
    let reads = 0;
    await assert.rejects(
      validateEnvironment({ ...local, API_URL }, async () => {
        reads++;
        return "";
      }),
    );
    assert.equal(reads, 0);
  }
});
test("accept loopback and reject missing credentials", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"])
    validateLocalInfo({ ...local, API_URL: `http://${host}:54321` });
  assert.throws(() => validateLocalInfo({ ...local, SERVICE_ROLE_KEY: "" }));
});
test("reject each conflicting environment override", async () => {
  for (const assignment of ["SUPABASE_URL=https://remote.supabase.co", "SUPABASE_KEY=wrong", "ALLOW_SIGNUP=true"]) {
    await assert.rejects(
      validateEnvironment(local, async () => assignment),
      /stopped before writes/,
    );
  }
  await validateEnvironment(
    local,
    async () => "ALLOW_SIGNUP=false\nSUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_KEY=test-public",
  );
});
