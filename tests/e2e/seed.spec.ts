import { test, expect } from "./fixtures";

// R-01/R-02: real trainer -> trainee -> persistence -> trainer, without mocking Auth/API/DB.
test("zapisany trening przetrwa odświeżenie, a wyniki zobaczy tylko przypisany trener", async ({ trainingUsers }) => {
  const { trainerPage: trainer, traineePage: trainee, otherTrainerPage: outsider, traineeId } = trainingUsers;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const until = new Date(`${today}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 28);

  await trainer.goto("/dashboard");
  await trainer.getByRole("link", { name: "Plany i treningi" }).click();
  const planForm = trainer.getByRole("form", { name: "Nowy plan treningowy" });
  await planForm.getByRole("combobox", { name: "Podopieczny", exact: true }).selectOption(traineeId);
  await planForm.getByLabel("Nazwa planu").fill("Plan siłowy E2E");
  await planForm.getByLabel("Ważny od").fill(today);
  await planForm.getByLabel("Ważny do").fill(until.toISOString().slice(0, 10));
  await planForm.getByRole("button", { name: "Utwórz plan", exact: true }).click();
  await expect(trainer.getByRole("status")).toContainText("Plan został utworzony");

  await trainer.getByRole("button", { name: "Dodaj trening", exact: true }).click();
  await trainer.getByLabel("Nazwa jednostki").fill("Trening A");
  await trainer.getByLabel("Data treningu").fill(today);
  await trainer.getByLabel("Rozgrzewka", { exact: true }).fill("5 minut roweru i mobilizacja");
  const exercise = trainer.getByRole("group", { name: "Ćwiczenie 1", exact: true });
  await exercise.getByLabel("Nazwa ćwiczenia").fill("Przysiad");
  await exercise.getByRole("combobox", { name: "Serie", exact: true }).selectOption("range");
  await exercise.getByLabel("Serie: minimum").fill("3");
  await exercise.getByLabel("Serie: maksimum").fill("5");
  await exercise.getByLabel("Powtórzenia: liczba").fill("10");
  await exercise.getByLabel("Ciężar (kg, opcjonalnie)").fill("40");
  await trainer.getByRole("button", { name: "Zapisz trening", exact: true }).click();
  await expect(trainer.getByRole("status")).toHaveText("Trening został zapisany.");

  // CRUD applies to a concrete planned unit; changes must persist through reload.
  await trainer.getByRole("button", { name: "Edytuj trening", exact: true }).click();
  await trainer.getByLabel("Nazwa jednostki").fill("Trening A — przysiady");
  await trainer.getByRole("button", { name: "Zapisz trening", exact: true }).click();
  await expect(trainer.getByRole("status")).toHaveText("Trening został zapisany.");
  await trainer.reload();
  await expect(trainer.getByRole("heading", { name: "Trening A — przysiady", exact: true })).toBeVisible();
  await trainer.getByRole("button", { name: "Powtórz jednostkę", exact: true }).click();
  await trainer.getByLabel("Nazwa jednostki").fill("Jednostka do usunięcia");
  await trainer.getByRole("button", { name: "Zapisz trening", exact: true }).click();
  const duplicate = trainer.getByRole("listitem").filter({
    has: trainer.getByRole("heading", { name: "Jednostka do usunięcia", exact: true }),
  });
  await duplicate.getByRole("button", { name: "Usuń trening", exact: true }).click();
  await duplicate.getByRole("button", { name: "Potwierdź usunięcie", exact: true }).click();
  await expect(trainer.getByRole("status")).toHaveText("Zaplanowany trening został usunięty.");
  await trainer.reload();
  await expect(trainer.getByRole("heading", { name: "Jednostka do usunięcia", exact: true })).toHaveCount(0);
  await expect(trainer.getByRole("heading", { name: "Trening A — przysiady", exact: true })).toBeVisible();

  await trainee.goto("/dashboard");
  await trainee.getByRole("link", { name: "Twoje treningi" }).click();
  await trainee.getByRole("link", { name: /Trening A — przysiady/ }).click();
  const workoutUrl = trainee.url();
  await trainee.getByRole("button", { name: "Rozpocznij trening", exact: true }).click();
  await expect(trainee.getByRole("status")).toContainText("Trening rozpoczęty");
  await trainee.getByLabel("Rozgrzewka wykonana", { exact: true }).check();
  for (let index = 1; index <= 3; index++) {
    const set = trainee.getByRole("group", { name: `Seria ${index} · Przysiad`, exact: true });
    await set.getByLabel("Powtórzenia", { exact: true }).fill(index === 3 ? "8" : "10");
    await set.getByLabel("Ciężar (kg)", { exact: true }).fill("42.5");
  }
  await trainee.getByLabel("Ocena ćwiczenia Przysiad (1–10)", { exact: true }).fill("7");
  await trainee.getByLabel("Ocena całego treningu (1–10)", { exact: true }).fill("8");
  await trainee.getByRole("button", { name: "Zapisz wyniki", exact: true }).click();
  await expect(trainee.getByRole("status")).toHaveText("Wyniki zapisane.");
  await trainee.reload();
  await expect(
    trainee.getByRole("group", { name: "Seria 3 · Przysiad", exact: true }).getByLabel("Powtórzenia", { exact: true }),
  ).toHaveValue("8");
  await expect(
    trainee.getByRole("group", { name: "Seria 1 · Przysiad", exact: true }).getByLabel("Ciężar (kg)", { exact: true }),
  ).toHaveValue("42.5");
  await expect(trainee.getByLabel("Rozgrzewka wykonana", { exact: true })).toBeChecked();
  await trainee.getByRole("button", { name: "Zakończ trening", exact: true }).click();
  await expect(trainee.getByRole("status")).toHaveText("Trening zakończony. Wyniki są zapisane.");

  await trainee.getByRole("textbox", { name: "Twój komentarz", exact: true }).fill("Ostatnia seria była wymagająca.");
  await trainee.getByRole("button", { name: "Zapisz komentarz", exact: true }).click();
  await expect(trainee.getByRole("status")).toHaveText("Komentarz zapisany.");
  await trainer.goto(workoutUrl);
  const actual = trainer.getByRole("region", { name: "Wykonanie: Przysiad", exact: true });
  await expect(actual).toContainText("Wykonane serie: 3");
  await expect(actual).toContainText("7/10");
  await expect(actual.getByText("42,5 kg", { exact: true })).toHaveCount(3);
  await expect(actual.getByText("8", { exact: true })).toBeVisible();
  await expect(trainer.getByRole("region", { name: "Plan: Przysiad", exact: true })).toContainText("40 kg");
  await expect(trainer.getByText("Ostatnia seria była wymagająca.", { exact: true })).toBeVisible();

  // Changing visibility must revoke the trainer's access on the next request.
  await trainee.getByRole("combobox", { name: "Widoczność komentarza", exact: true }).selectOption("private");
  await trainee.getByRole("button", { name: "Zapisz komentarz", exact: true }).click();
  await expect(trainee.getByRole("status")).toHaveText("Komentarz zapisany.");
  await trainer.reload();
  await expect(trainer.getByText("Ostatnia seria była wymagająca.", { exact: true })).toHaveCount(0);
  await trainee.reload();
  await expect(trainee.getByRole("textbox", { name: "Twój komentarz", exact: true })).toHaveValue(
    "Ostatnia seria była wymagająca.",
  );
  const denied = await outsider.goto(workoutUrl);
  expect(denied?.status()).toBe(404);
  await expect(outsider.getByText("42,5 kg", { exact: true })).toHaveCount(0);
});
