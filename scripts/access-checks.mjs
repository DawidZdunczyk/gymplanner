import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { clientOptions, requireData } from "./access-fixtures.mjs";

const ids = (rows) => rows.map((row) => row.id).sort();

export async function runDatabaseChecks({ accounts: a, admin, info }) {
  const expected = {
    trainerA: [a.trainerA.id, a.traineeA.id],
    trainerB: [a.trainerB.id, a.traineeB.id],
    traineeA: [a.trainerA.id, a.traineeA.id],
    traineeB: [a.trainerB.id, a.traineeB.id],
    unassigned: [a.unassigned.id],
    unconfigured: [],
  };
  for (const [key, account] of Object.entries(a)) {
    const profiles = requireData(await account.client.from("profiles").select("*"), "Read profiles");
    assert.deepEqual(ids(profiles), expected[key].sort(), `Profile isolation: ${key}`);
    const assignments = requireData(await account.client.from("trainer_assignments").select("*"), "Read assignments");
    assert.equal(assignments.length, ["unassigned", "unconfigured"].includes(key) ? 0 : 1);
    assert.ok(assignments.every((row) => row.trainer_id === account.id || row.trainee_id === account.id));
  }
  assert.deepEqual(
    requireData(await a.trainerA.client.from("profiles").select("*").eq("id", a.traineeB.id), "Known foreign UUID"),
    [],
  );
  const anon = createClient(info.API_URL, info.ANON_KEY, clientOptions);
  for (const table of ["profiles", "trainer_assignments"]) {
    const result = await anon.from(table).select("*");
    assert.ok(result.error || result.data.length === 0, "Anonymous data denied");
  }
  const fixtureIds = Object.values(a).map((account) => account.id);
  const snapshot = async () => ({
    profiles: requireData(
      await admin.from("profiles").select("*").in("id", fixtureIds).order("id"),
      "Snapshot profiles",
    ),
    assignments: requireData(
      await admin.from("trainer_assignments").select("*").in("trainee_id", fixtureIds).order("trainee_id"),
      "Snapshot assignments",
    ),
  });
  const before = await snapshot();
  for (const account of Object.values(a)) {
    for (const table of ["profiles", "trainer_assignments"]) {
      const row =
        table === "profiles"
          ? { ...a.unassigned.profile, role: "trainer" }
          : { trainee_id: a.unassigned.id, trainer_id: a.trainerB.id };
      const pk = table === "profiles" ? "id" : "trainee_id";
      for (const operation of ["insert", "upsert", "update", "delete"]) {
        let query = account.client.from(table);
        query =
          operation === "delete"
            ? query.delete().eq(pk, a.traineeA.id)
            : operation === "update"
              ? query.update(row).eq(pk, a.traineeA.id)
              : query[operation](row);
        const result = await query;
        assert.ok(result.error, `Reject ${operation} ${table}`);
      }
    }
  }
  assert.deepEqual(await snapshot(), before, "Denied writes preserve fixture data");
  requireData(
    await a.unconfigured.client.auth.updateUser({ data: { role: "trainer", trainer_id: a.trainerA.id } }),
    "Forge editable metadata",
  );
  assert.deepEqual(
    requireData(await a.unconfigured.client.from("profiles").select("*"), "Metadata grants no access"),
    [],
  );
  const invalidRelations = [
    { trainee_id: a.traineeA.id, trainer_id: a.trainerB.id },
    { trainee_id: a.trainerB.id, trainer_id: a.trainerA.id },
    { trainee_id: a.unassigned.id, trainer_id: a.traineeA.id },
    { trainee_id: a.unassigned.id, trainer_id: a.unassigned.id },
    ...["trainee_id", "trainer_id", "trainer_role", "trainee_role"].map((field) => ({
      trainee_id: a.unassigned.id,
      trainer_id: a.trainerA.id,
      [field]: null,
    })),
    { trainee_id: a.unassigned.id, trainer_id: a.trainerA.id, trainer_role: "trainee" },
    { trainee_id: a.unassigned.id, trainer_id: a.trainerA.id, trainee_role: "trainer" },
  ];
  for (const relation of invalidRelations)
    assert.ok(
      (await admin.from("trainer_assignments").insert(relation)).error,
      "Constraint rejects invalid relationship",
    );
  for (const patch of [
    { role: null },
    { display_name: " " },
    { identification_label: " " },
    { identification_label: ` ${a.trainerA.profile.identification_label.toUpperCase()} ` },
    { display_name: "x".repeat(121) },
  ]) {
    assert.ok(
      (await admin.from("profiles").update(patch).eq("id", a.unassigned.id)).error,
      "Constraint rejects invalid profile",
    );
  }
  assert.ok(
    (await admin.from("profiles").update({ role: "trainee" }).eq("id", a.trainerA.id)).error,
    "Cannot change assigned role",
  );
  assert.deepEqual(await snapshot(), before, "Constraints preserve fixture data");
  requireData(await admin.from("trainer_assignments").delete().eq("trainee_id", a.traineeA.id), "Revoke assignment");
  assert.deepEqual(
    ids(requireData(await a.trainerA.client.from("profiles").select("*"), "Recheck existing trainer JWT")),
    [a.trainerA.id],
  );
  assert.deepEqual(
    ids(requireData(await a.traineeA.client.from("profiles").select("*"), "Recheck existing trainee JWT")),
    [a.traineeA.id],
  );
  requireData(
    await admin.from("trainer_assignments").insert({ trainee_id: a.traineeA.id, trainer_id: a.trainerA.id }),
    "Restore fixture relation",
  );
  console.log("Access database checks passed: RLS, mutation denial, metadata, constraints, revocation.");
}
