import { test, expect } from "./fixtures";
import type { TrainingPlan, TrainingWorkout } from "../../src/lib/training-contract";

// R-05 / US-02, US-03: supersets preserve rounds and a correction preserves the original.
// Seed pattern: seed.spec.ts. Only setup uses real authenticated HTTP; execution stays in the mobile UI.
test("trzy rundy superserii i korekta z zamiennikiem zachowują oryginalną rozpiskę", async ({
  trainingUsers,
}, testInfo) => {
  const { trainerPage: trainer, traineePage: trainee, traineeId } = trainingUsers;
  const origin = "http://127.0.0.1:4321";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const until = new Date(`${today}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 28);
  async function create<T>(action: string, payload: object): Promise<T> {
    const response = await trainer.request.post("/api/training", {
      headers: { Origin: origin },
      data: { action, payload },
    });
    expect(response.ok()).toBeTruthy();
    return ((await response.json()) as { data: T }).data;
  }
  const plan = await create<TrainingPlan>("create_plan", {
    trainee_id: traineeId,
    title: "Plan superserii E2E",
    valid_from: today,
    valid_until: until.toISOString().slice(0, 10),
  });
  const workout = await create<TrainingWorkout>("create_workout", {
    plan_id: plan.id,
    week_start: monday.toISOString().slice(0, 10),
    scheduled_for: today,
    unit_label: "Superseria mobilna",
    prescription: {
      warmup: "Mobilizacja przed superserią",
      supersets: [
        {
          id: "group-a",
          name: "Siła i stabilizacja",
          rounds: 3,
          rest_between_exercises: "15 s",
          rest_between_rounds: "60 s",
        },
      ],
      exercises: [
        {
          id: "exercise-a",
          name: "Wiosłowanie",
          sets: { kind: "fixed", min: 5, max: 5 },
          reps: { kind: "fixed", min: 6, max: 6 },
          weight_kg: 20,
          duration_seconds: null,
          rir: 2,
          rpe: null,
          notes: "Oryginalny cel trenera",
          group_id: "group-a",
        },
        {
          id: "exercise-b",
          name: "Deska",
          sets: null,
          reps: null,
          weight_kg: null,
          duration_seconds: 30,
          rir: null,
          rpe: null,
          notes: "Utrzymaj pozycję",
          group_id: "group-a",
        },
      ],
    },
  });

  // Three rounds mean three entries per exercise, neither 3 × 5 nor a single entry for null sets.
  await trainee.setViewportSize({ width: 390, height: 844 });
  const path = `/dashboard/training/${workout.id}`;
  // A slow script download must not expose an enabled button that silently ignores a click.
  let releaseScripts: () => void = () => undefined;
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await trainee.route("**/*.js", async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await trainee.goto(path, { waitUntil: "commit" });
    await expect(trainee.getByRole("button", { name: "Rozpocznij trening", exact: true })).toBeDisabled();
  } finally {
    releaseScripts();
    await trainee.unrouteAll({ behavior: "wait" });
  }
  await trainee.getByRole("button", { name: "Rozpocznij trening", exact: true }).click();
  await expect(trainee.getByRole("status")).toContainText("Trening rozpoczęty");
  await expect(trainee.getByRole("group", { name: /^Runda \d+ · Wiosłowanie$/ })).toHaveCount(3);
  await expect(trainee.getByRole("group", { name: /^Runda \d+ · Deska$/ })).toHaveCount(3);
  await trainee.getByRole("radio", { name: "Rozgrzewka wykonana", exact: true }).check();
  for (let round = 1; round <= 3; round++) {
    const strength = trainee.getByRole("group", { name: `Runda ${round} · Wiosłowanie`, exact: true });
    await strength.getByRole("spinbutton", { name: "Powtórzenia", exact: true }).fill("6");
    await strength.getByRole("spinbutton", { name: "Ciężar (kg)", exact: true }).fill("20");
    const timed = trainee.getByRole("group", { name: `Runda ${round} · Deska`, exact: true });
    await timed.getByRole("spinbutton", { name: "Czas (sekundy)", exact: true }).fill("35");
  }
  await trainee.getByRole("spinbutton", { name: "Ocena ćwiczenia Wiosłowanie (1–10)", exact: true }).fill("7");
  await trainee.getByRole("spinbutton", { name: "Ocena ćwiczenia Deska (1–10)", exact: true }).fill("6");
  await trainee.getByRole("spinbutton", { name: "Ocena całego treningu (1–10)", exact: true }).fill("7");
  await trainee.getByRole("button", { name: "Zakończ trening", exact: true }).click();
  await expect(trainee.getByRole("status")).toHaveText("Trening zakończony. Wyniki są zapisane.");

  // Correct only the completed execution, retaining a full replacement description and the snapshot.
  await trainee.getByRole("button", { name: "Popraw wyniki treningu", exact: true }).click();
  await trainee.getByRole("checkbox", { name: "Użyto zamiennika zamiast Wiosłowanie", exact: true }).check();
  await trainee.getByRole("textbox", { name: "Nazwa zamiennika", exact: true }).fill("Wiosłowanie hantlą");
  await trainee.getByRole("spinbutton", { name: "Serie zamiennika", exact: true }).fill("3");
  await trainee.getByRole("spinbutton", { name: "Powtórzenia zamiennika", exact: true }).fill("12");
  await trainee.getByRole("spinbutton", { name: "RIR zamiennika (lub RPE)", exact: true }).fill("2");
  await trainee.getByRole("spinbutton", { name: "Cel ciężaru zamiennika (kg, opcjonalny)", exact: true }).fill("25");
  for (let index = 1; index <= 3; index++) {
    const set = trainee.getByRole("group", { name: `Seria ${index} · Wiosłowanie hantlą`, exact: true });
    await set.getByRole("spinbutton", { name: "Powtórzenia", exact: true }).fill("12");
    await set.getByRole("spinbutton", { name: "Ciężar (kg)", exact: true }).fill("25");
  }
  await trainee.getByRole("spinbutton", { name: "Ocena ćwiczenia Wiosłowanie (1–10)", exact: true }).fill("8");
  await trainee.getByRole("button", { name: "Zapisz korektę", exact: true }).click();
  await expect(trainee.getByRole("status")).toContainText("Korekta zapisana");
  await trainee.reload();
  await expect(trainee.getByRole("group", { name: /^Seria \d+ · Wiosłowanie hantlą$/ })).toHaveCount(3);
  await expect(
    trainee
      .getByRole("group", { name: "Seria 3 · Wiosłowanie hantlą", exact: true })
      .getByRole("spinbutton", { name: "Powtórzenia", exact: true }),
  ).toHaveValue("12");
  await expect(
    trainee
      .getByRole("group", { name: "Runda 3 · Deska", exact: true })
      .getByRole("spinbutton", { name: "Czas (sekundy)", exact: true }),
  ).toHaveValue("35");

  await trainer.goto(path);
  await expect(trainer.getByText(/^Poprawiony ·/)).toBeVisible();
  const original = trainer.getByRole("region", { name: "Plan: Wiosłowanie", exact: true });
  await expect(original).toContainText("20 kg");
  await expect(original).toContainText("Oryginalny cel trenera");
  await expect(original).toContainText("Serie z rund superserii");
  const corrected = trainer.getByRole("region", { name: "Wykonanie: Wiosłowanie hantlą", exact: true });
  await expect(corrected).toContainText("Zamiennik podopiecznego");
  await expect(corrected).toContainText("Wykonane serie: 3");
  await expect(corrected).toContainText("8/10");
  await expect(corrected.getByText("25 kg", { exact: true })).toHaveCount(4);
  await expect(
    trainer.getByRole("region", { name: "Wykonanie: Deska", exact: true }).getByText("35 s", { exact: true }),
  ).toHaveCount(3);
  await testInfo.attach("mobile-results", {
    body: await trainee.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await testInfo.attach("trainer-results", {
    body: await trainer.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
