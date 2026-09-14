import assert from "node:assert/strict";
import test from "node:test";
import { loadAccess, authFailure, isProtectedPath, assignedTrainee, sortProfiles } from "../src/lib/access.ts";

function responses(...results) {
  const client = {
    from() {
      return client;
    },
    select() {
      return client;
    },
    eq() {
      return client;
    },
    in() {
      return client;
    },
    maybeSingle() {
      return client;
    },
    then(resolve, reject) {
      const result = results.shift();
      return (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)).then(resolve, reject);
    },
  };
  return client;
}
const trainer = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "trainer",
  display_name: "Trener",
  identification_label: "trener",
};
const trainee = {
  ...trainer,
  id: "00000000-0000-0000-0000-000000000002",
  role: "trainee",
  display_name: "Anna",
  identification_label: "poranna",
};
const ok = (data) => ({ data, error: null });
const bad = { data: null, error: { code: "unavailable" } };

test("missing profile differs from database and transport failures", async () => {
  assert.equal((await loadAccess(responses(ok(null)), trainer.id)).kind, "unconfigured");
  for (const result of [bad, new Error("network")])
    assert.equal((await loadAccess(responses(result), trainer.id)).kind, "unavailable");
});
test("each trainer/trainee query error is unavailable rather than empty", async () => {
  for (const profile of [trainer, trainee]) {
    assert.equal((await loadAccess(responses(ok(profile), bad), profile.id)).kind, "unavailable");
    const assignment = profile.role === "trainer" ? [{ trainee_id: trainee.id }] : { trainer_id: trainer.id };
    assert.equal((await loadAccess(responses(ok(profile), ok(assignment), bad), profile.id)).kind, "unavailable");
  }
  assert.deepEqual(await loadAccess(responses(ok(trainer), ok([])), trainer.id), {
    kind: "trainer",
    profile: trainer,
    trainees: [],
  });
  assert.deepEqual(await loadAccess(responses(ok(trainee), ok(null)), trainee.id), {
    kind: "trainee",
    profile: trainee,
    trainer: null,
  });
});
test("Auth invalid session differs from unavailable service and unknown errors", () => {
  for (const error of [{ name: "AuthSessionMissingError" }, { status: 401 }, { code: "refresh_token_not_found" }])
    assert.equal(authFailure(error), "anonymous");
  for (const error of [{ status: 500 }, { status: 429 }, { name: "AuthRetryableFetchError" }, {}])
    assert.equal(authFailure(error), "unavailable");
});
test("exact route protection and selected assigned identity", () => {
  assert.ok(isProtectedPath("/dashboard"));
  assert.ok(isProtectedPath("/dashboard/trainees/uuid"));
  assert.equal(isProtectedPath("/dashboard-public"), false);
  assert.equal(assignedTrainee({ kind: "trainee", profile: trainee, trainer }, trainee.id), null);
  assert.equal(assignedTrainee({ kind: "trainer", profile: trainer, trainees: [trainee] }, "bad-id"), null);
  assert.equal(assignedTrainee({ kind: "trainer", profile: trainer, trainees: [trainee] }, trainee.id), trainee);
  assert.equal(sortProfiles([trainee, { ...trainee, id: trainer.id }]).length, 2, "same-name people are retained");
});
