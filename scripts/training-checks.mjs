import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { clientOptions, requireData } from "./access-fixtures.mjs";

const target = (min, max = min) => ({ kind: min === max ? "fixed" : "range", min, max });
const unlimited = { kind: "unlimited", min: null, max: null };
const exercise = (id, overrides = {}) => ({
  id,
  name: `Ćwiczenie ${id}`,
  sets: target(3, 5),
  reps: target(8, 12),
  weight_kg: 40,
  duration_seconds: null,
  rir: 2,
  rpe: null,
  notes: "Kontrolowane tempo",
  group_id: null,
  ...overrides,
});
const prescription = {
  warmup: "5 minut marszu i mobilizacja",
  exercises: [
    exercise("squat", { group_id: "group-a" }),
    exercise("plank", { group_id: "group-a", sets: null, reps: null, weight_kg: null, duration_seconds: 30 }),
    exercise("pushup", { sets: null, reps: unlimited, weight_kg: null }),
  ],
  supersets: [
    {
      id: "group-a",
      name: "Superseria A",
      rounds: 3,
      rest_between_exercises: "Do tętna 120",
      rest_between_rounds: "90 s",
    },
  ],
};
const date = (offset = 0) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const monday = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const results = () => ({
  warmup_status: "done",
  rating: 7,
  exercises: prescription.exercises.map((e, i) => ({
    exercise_id: e.id,
    skipped: false,
    rating: 6,
    replacement: null,
    sets: Array.from({ length: i === 2 ? 1 : 3 }, () => ({
      reps: i === 1 ? null : 6,
      weight_kg: i === 0 ? 35 : null,
      duration_seconds: i === 1 ? 25 : null,
      skipped: false,
    })),
  })),
});

export async function runTrainingChecks({ accounts: a, admin, info }) {
  const raw = (who, action, payload) => a[who].client.rpc("training_mutate", { p_action: action, p_payload: payload });
  const mutate = async (who, action, payload) => {
    const result = await raw(who, action, payload);
    if (result.error) throw new Error(`${action} failed (${result.error.code}): ${result.error.message}`);
    return result.data;
  };
  const denied = async (who, action, payload, code) => {
    const result = await raw(who, action, payload);
    assert.equal(result.error?.code, code, `${action}: ${result.error?.message ?? "unexpected success"}`);
  };
  const plan = await mutate("trainerA", "create_plan", {
    trainee_id: a.traineeA.id,
    title: "Plan testowy",
    valid_from: date(-20),
    valid_until: date(20),
  });
  const createWorkout = (label = "Jednostka A", day = date(), planId = plan.id) =>
    mutate("trainerA", "create_workout", {
      plan_id: planId,
      week_start: monday(day),
      scheduled_for: day,
      unit_label: label,
      prescription: clone(prescription),
    });
  const foreignPlan = await mutate("trainerB", "create_plan", {
    trainee_id: a.traineeB.id,
    title: "Plan obcej relacji",
    valid_from: date(-2),
    valid_until: date(2),
  });
  await denied("trainerB", "create_plan", { ...plan, trainee_id: a.traineeA.id }, "PT400");
  await denied(
    "trainerB",
    "create_plan",
    {
      trainee_id: a.traineeA.id,
      title: "Obcy",
      valid_from: date(),
      valid_until: date(1),
    },
    "PT404",
  );
  await denied(
    "traineeA",
    "create_plan",
    {
      trainee_id: a.traineeA.id,
      title: "Samodzielny",
      valid_from: date(),
      valid_until: date(1),
    },
    "PT404",
  );
  await denied(
    "trainerA",
    "create_workout",
    {
      plan_id: foreignPlan.id,
      week_start: monday(date()),
      scheduled_for: date(),
      unit_label: "Obcy",
      prescription,
    },
    "PT404",
  );
  const anon = createClient(info.API_URL, info.ANON_KEY, clientOptions);
  assert.equal((await anon.rpc("training_mutate", { p_action: "create_plan", p_payload: {} })).error?.code, "42501");
  for (const who of ["trainerB", "traineeB", "unassigned", "unconfigured"]) {
    assert.deepEqual(
      requireData(await a[who].client.from("training_plans").select("*").eq("id", plan.id), "Plan RLS"),
      [],
    );
  }

  const nextWeek = await createWorkout("Niezależna jednostka w kolejnym tygodniu", date(7));
  let editable = await createWorkout("Do edycji");
  const editedPrescription = clone(prescription);
  editedPrescription.exercises[0].weight_kg = 45;
  editable = await mutate("trainerA", "update_workout", {
    workout_id: editable.id,
    version: editable.version,
    scheduled_for: editable.scheduled_for,
    unit_label: "Jednostka poprawiona",
    prescription: editedPrescription,
  });
  assert.equal(editable.version, 2);
  assert.equal(editable.prescription.exercises[0].weight_kg, 45);
  await denied(
    "trainerA",
    "update_workout",
    {
      workout_id: editable.id,
      version: editable.version,
      scheduled_for: date(7),
      unit_label: "Inny tydzień",
      prescription,
    },
    "PT400",
  );
  await denied("trainerA", "delete_workout", { workout_id: editable.id, version: 1 }, "PT409");
  await mutate("trainerA", "delete_workout", { workout_id: editable.id, version: editable.version });
  assert.deepEqual(
    requireData(
      await a.trainerA.client.from("training_workouts").select("*").eq("id", editable.id),
      "Deleted planned workout",
    ),
    [],
  );
  assert.deepEqual(
    requireData(
      await a.trainerA.client.from("training_workouts").select("*").eq("id", nextWeek.id).single(),
      "Read existing workout in another week after edit and deletion",
    ),
    nextWeek,
    "Editing and deleting one week's workout preserves another week's prescription, version and existence",
  );

  // Start every rejection case from a proven-valid complete prescription. Fixed
  // reps expose the SQL NULL-kind bug; a range with unequal bounds would mask it.
  const validationPrescription = clone(prescription);
  validationPrescription.exercises[0].reps = target(10);
  const validationPayload = {
    plan_id: plan.id,
    week_start: monday(date()),
    scheduled_for: date(),
    unit_label: "Poprawna baza walidacji",
    prescription: validationPrescription,
  };
  await mutate("trainerA", "create_workout", validationPayload);
  for (const [name, makeInvalid] of [
    [
      "missing target bound",
      (p) => {
        p.exercises[0].sets.min = null;
      },
    ],
    [
      "negative weight",
      (p) => {
        p.exercises[0].weight_kg = -1;
      },
    ],
    [
      "RPE above maximum",
      (p) => {
        p.exercises[0].rpe = 11;
      },
    ],
    [
      "fractional set target",
      (p) => {
        p.exercises[0].sets.min = 1.5;
      },
    ],
    [
      "unknown target kind",
      (p) => {
        p.exercises[0].reps.kind = "invalid";
      },
    ],
    [
      "null target kind",
      (p) => {
        p.exercises[0].reps.kind = null;
      },
    ],
    // Alter the standalone exercise so the valid superset still has two members.
    [
      "unknown superset",
      (p) => {
        p.exercises[2].group_id = "unknown";
      },
    ],
    [
      "duplicate exercise ID",
      (p) => {
        p.exercises[1].id = p.exercises[0].id;
      },
    ],
    [
      "zero superset rounds",
      (p) => {
        p.supersets[0].rounds = 0;
      },
    ],
    [
      "missing required exercise field",
      (p) => {
        delete p.exercises[0].rir;
      },
    ],
    [
      "unknown prescription field",
      (p) => {
        p.unexpected = "reject unknown keys";
      },
    ],
  ]) {
    const invalid = clone(validationPrescription);
    makeInvalid(invalid);
    const result = await raw("trainerA", "create_workout", { ...validationPayload, prescription: invalid });
    assert.equal(result.error?.code, "PT400", `${name}: ${result.error?.message ?? "unexpected success"}`);
  }

  let workout = await createWorkout();
  for (const who of ["trainerB", "traineeB", "unassigned", "unconfigured"]) {
    assert.deepEqual(
      requireData(await a[who].client.from("training_workouts").select("*").eq("id", workout.id), "Workout RLS"),
      [],
    );
    await denied(who, "start_workout", { workout_id: workout.id, version: workout.version }, "PT404");
  }
  await denied("trainerA", "start_workout", { workout_id: workout.id, version: workout.version }, "PT404");
  await denied("traineeA", "delete_workout", { workout_id: workout.id, version: workout.version }, "PT404");
  await denied(
    "traineeA",
    "complete_workout",
    { workout_id: workout.id, version: workout.version, results: results() },
    "PT409",
  );
  for (const table of ["training_plans", "training_workouts", "training_comments"]) {
    for (const who of ["trainerA", "traineeA"]) {
      assert.equal((await a[who].client.from(table).insert({})).error?.code, "42501");
      assert.equal(
        (await a[who].client.from(table).update({ id: workout.id }).eq("id", workout.id)).error?.code,
        "42501",
      );
      assert.equal((await a[who].client.from(table).delete().eq("id", workout.id)).error?.code, "42501");
    }
  }
  workout = await mutate("traineeA", "start_workout", { workout_id: workout.id, version: workout.version });
  assert.equal(workout.status, "in_progress");
  assert.deepEqual(workout.snapshot, prescription);
  const draft = results();
  draft.warmup_status = null;
  draft.rating = null;
  draft.exercises[0].rating = null;
  draft.exercises[0].sets[0].weight_kg = null;
  workout = await mutate("traineeA", "save_results", {
    workout_id: workout.id,
    version: workout.version,
    results: draft,
  });
  const persisted = requireData(
    await a.traineeA.client.from("training_workouts").select("*").eq("id", workout.id).single(),
    "Persist draft",
  );
  assert.deepEqual(persisted.results, draft);
  await denied(
    "traineeA",
    "complete_workout",
    { workout_id: workout.id, version: workout.version, results: draft },
    "PT400",
  );
  for (const mutateInvalid of [
    (r) => {
      r.warmup_status = null;
    },
    (r) => {
      r.rating = 0;
    },
    (r) => {
      r.exercises.pop();
    },
    (r) => {
      r.exercises[0].rating = null;
    },
    (r) => {
      r.exercises[0].sets[0].weight_kg = null;
    },
    (r) => {
      r.exercises[0].sets[0].reps = 1.5;
    },
    (r) => {
      r.exercises[1].sets[0].duration_seconds = null;
    },
    (r) => {
      r.exercises[0].sets = [];
    },
    (r) => {
      r.exercises[0].exercise_id = "foreign-exercise";
    },
    (r) => {
      r.exercises[0].replacement = exercise("replacement");
    },
  ]) {
    const invalid = results();
    mutateInvalid(invalid);
    await denied(
      "traineeA",
      "complete_workout",
      { workout_id: workout.id, version: workout.version, results: invalid },
      "PT400",
    );
  }
  const finalResults = results();
  finalResults.exercises[2] = { ...finalResults.exercises[2], skipped: true, rating: null, sets: [] };
  // Three rounds produce three sets per group exercise; repetitions may be below target.
  workout = await mutate("traineeA", "complete_workout", {
    workout_id: workout.id,
    version: workout.version,
    results: finalResults,
  });
  assert.equal(workout.status, "completed");
  assert.ok(workout.completed_at);
  assert.deepEqual(workout.snapshot, prescription);
  for (const action of ["delete_workout", "update_workout"]) {
    await denied(
      "trainerA",
      action,
      action === "delete_workout"
        ? { workout_id: workout.id, version: workout.version }
        : {
            workout_id: workout.id,
            version: workout.version,
            scheduled_for: date(),
            unit_label: "Edycja historii",
            prescription,
          },
      "PT409",
    );
  }
  const corrected = clone(finalResults);
  corrected.exercises[0].replacement = exercise("replacement", {
    name: "Wykroki",
    group_id: null,
    sets: target(1),
    reps: target(10),
    weight_kg: null,
  });
  corrected.exercises[0].sets = [{ reps: 12, weight_kg: null, duration_seconds: null, skipped: false }];
  workout = await mutate("traineeA", "correct_workout", {
    workout_id: workout.id,
    version: workout.version,
    results: corrected,
  });
  assert.ok(workout.corrected_at);
  assert.deepEqual(workout.snapshot, prescription);
  assert.equal(workout.results.exercises[0].replacement.name, "Wykroki");
  const invalidReplacement = clone(corrected);
  invalidReplacement.exercises[0].replacement.rir = null;
  await denied(
    "traineeA",
    "correct_workout",
    { workout_id: workout.id, version: workout.version, results: invalidReplacement },
    "PT400",
  );
  await denied(
    "traineeA",
    "correct_workout",
    { workout_id: workout.id, version: workout.version - 1, results: corrected },
    "PT409",
  );

  const comment = await mutate("traineeA", "save_comment", {
    workout_id: workout.id,
    body: "Widoczne dla trenera",
    visibility: "public",
  });
  assert.equal(
    requireData(
      await a.trainerA.client.from("training_comments").select("*").eq("workout_id", workout.id),
      "Public comment",
    ).length,
    1,
  );
  const privateComment = await mutate("traineeA", "save_comment", {
    workout_id: workout.id,
    body: "Tylko dla mnie",
    visibility: "private",
  });
  assert.equal(privateComment.id, comment.id);
  assert.deepEqual(
    requireData(
      await a.trainerA.client.from("training_comments").select("*").eq("workout_id", workout.id),
      "Private comment hidden",
    ),
    [],
  );
  assert.equal(
    requireData(
      await a.traineeA.client.from("training_comments").select("*").eq("workout_id", workout.id),
      "Private author access",
    )[0].body,
    "Tylko dla mnie",
  );
  await denied(
    "trainerA",
    "save_comment",
    { workout_id: workout.id, body: "Nadpisanie", visibility: "public" },
    "PT404",
  );

  let race = await createWorkout("Wyścig edycji i rozpoczęcia");
  const racing = await Promise.all([
    raw("trainerA", "update_workout", {
      workout_id: race.id,
      version: race.version,
      scheduled_for: date(),
      unit_label: "Wersja wyścigu",
      prescription: editedPrescription,
    }),
    raw("traineeA", "start_workout", { workout_id: race.id, version: race.version }),
  ]);
  assert.equal(racing.filter((r) => !r.error).length, 1, "Exactly one concurrent writer wins");
  assert.equal(racing.find((r) => r.error).error.code, "PT409");
  race = requireData(
    await a.traineeA.client.from("training_workouts").select("*").eq("id", race.id).single(),
    "Race result",
  );
  if (race.status === "planned")
    race = await mutate("traineeA", "start_workout", { workout_id: race.id, version: race.version });
  assert.deepEqual(race.snapshot, race.prescription);

  const expiring = await mutate("trainerA", "create_plan", {
    trainee_id: a.traineeA.id,
    title: "Wygasający",
    valid_from: date(-20),
    valid_until: date(1),
  });
  let startedBeforeExpiry = await createWorkout("Rozpoczęty przed wygaśnięciem", date(), expiring.id);
  const pendingAfterExpiry = await createWorkout("Nierozpoczęty po wygaśnięciu", date(), expiring.id);
  startedBeforeExpiry = await mutate("traineeA", "start_workout", {
    workout_id: startedBeforeExpiry.id,
    version: startedBeforeExpiry.version,
  });
  requireData(
    await admin
      .from("training_plans")
      .update({ valid_until: date(-1) })
      .eq("id", expiring.id),
    "Advance expiry fixture",
  );
  await denied(
    "traineeA",
    "start_workout",
    { workout_id: pendingAfterExpiry.id, version: pendingAfterExpiry.version },
    "PT409",
  );
  const belowTarget = results();
  belowTarget.exercises[0].sets = belowTarget.exercises[0].sets.slice(0, 1);
  startedBeforeExpiry = await mutate("traineeA", "complete_workout", {
    workout_id: startedBeforeExpiry.id,
    version: startedBeforeExpiry.version,
    results: belowTarget,
  });
  assert.equal(startedBeforeExpiry.status, "completed", "Expiry and target deviation do not block existing workout");
  await mutate("traineeA", "correct_workout", {
    workout_id: startedBeforeExpiry.id,
    version: startedBeforeExpiry.version,
    results: belowTarget,
  });
  const future = await mutate("trainerA", "create_plan", {
    trainee_id: a.traineeA.id,
    title: "Przyszły",
    valid_from: date(1),
    valid_until: date(10),
  });
  const futureWorkout = await createWorkout("Przyszły trening", date(1), future.id);
  await denied("traineeA", "start_workout", { workout_id: futureWorkout.id, version: futureWorkout.version }, "PT409");

  requireData(
    await admin.from("trainer_assignments").delete().eq("trainee_id", a.traineeA.id),
    "Revoke training assignment",
  );
  for (const who of ["trainerA", "traineeA"]) {
    for (const table of ["training_plans", "training_workouts", "training_comments"])
      assert.deepEqual(requireData(await a[who].client.from(table).select("*"), "Revoked RLS"), []);
  }
  await denied(
    "traineeA",
    "correct_workout",
    { workout_id: workout.id, version: workout.version, results: corrected },
    "PT404",
  );
  requireData(
    await admin.from("trainer_assignments").insert({ trainee_id: a.traineeA.id, trainer_id: a.trainerB.id }),
    "Reassign fixture",
  );
  assert.deepEqual(
    requireData(
      await a.trainerB.client.from("training_workouts").select("*").eq("id", workout.id),
      "New trainer cannot inherit old assignment data",
    ),
    [],
  );
  requireData(
    await admin.from("trainer_assignments").update({ trainer_id: a.trainerA.id }).eq("trainee_id", a.traineeA.id),
    "Restore training assignment",
  );
  console.log(
    "Training DB checks passed: CRUD, JSON validation, RLS, direct-write denial, version race, snapshot, completion, supersets, target deviations, corrections, private comments, expiry and revocation.",
  );
}
