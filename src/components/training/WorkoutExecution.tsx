import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import type {
  TrainingComment,
  TrainingExercise,
  TrainingExerciseResult,
  TrainingPlan,
  TrainingPrescription,
  TrainingResults,
  TrainingSetResult,
  TrainingTarget,
  TrainingWorkout,
} from "@/lib/training-contract";

interface Props {
  workout: TrainingWorkout;
  comments: TrainingComment[];
  plan: TrainingPlan;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 focus:border-lime-300 focus:outline-none focus:ring-1 focus:ring-lime-300 disabled:opacity-50";
const buttonClass =
  "rounded-lg border border-slate-600 px-4 py-2 font-medium hover:border-lime-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 disabled:cursor-wait disabled:opacity-50";
const primaryClass = cn(buttonClass, "border-lime-300 bg-lime-300 text-slate-950 hover:bg-lime-200");
const blankSet = (): TrainingSetResult => ({ reps: null, weight_kg: null, duration_seconds: null, skipped: false });

function targetText(target: TrainingTarget | null): string {
  if (!target) return "1 wykonanie";
  if (target.kind === "unlimited") return "bez limitu";
  return target.kind === "range" ? `${target.min}–${target.max}` : String(target.min);
}

function initialResults(prescription: TrainingPrescription): TrainingResults {
  return {
    warmup_status: null,
    rating: null,
    exercises: prescription.exercises.map((exercise) => {
      const group = prescription.supersets.find((item) => item.id === exercise.group_id);
      const count = group?.rounds ?? exercise.sets?.min ?? 1;
      return {
        exercise_id: exercise.id,
        skipped: false,
        rating: null,
        replacement: null,
        sets: Array.from({ length: Math.max(1, Math.min(100, count)) }, blankSet),
      };
    }),
  };
}

function NumericField({
  label,
  value,
  onChange,
  max,
  min = 0,
  integer = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max: number;
  integer?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={integer ? 1 : "any"}
        value={value ?? ""}
        onChange={(event) => {
          onChange(event.target.value === "" ? null : Number(event.target.value));
        }}
        className={inputClass}
      />
    </label>
  );
}

function PrescriptionSummary({ exercise, rounds = null }: { exercise: TrainingExercise; rounds?: number | null }) {
  return (
    <div className="space-y-1 text-sm text-slate-400">
      <p>
        Cel:{" "}
        {rounds !== null
          ? `${rounds} rund — po jednej serii w rundzie`
          : `${targetText(exercise.sets)}${exercise.sets ? " serii" : ""}`}
        {exercise.reps ? ` · ${targetText(exercise.reps)} powtórzeń` : ""}
        {exercise.weight_kg !== null ? ` · ${exercise.weight_kg} kg` : ""}
        {exercise.duration_seconds !== null ? ` · ${exercise.duration_seconds} s` : ""}
        {exercise.rir !== null ? ` · RIR ${exercise.rir}` : ""}
        {exercise.rpe !== null ? ` · RPE ${exercise.rpe}` : ""}
      </p>
      {exercise.notes && <p className="whitespace-pre-wrap">{exercise.notes}</p>}
    </div>
  );
}

export default function WorkoutExecution({ workout: original, comments: initialComments, plan }: Props) {
  const hydrated = useHydrated();
  const [workout, setWorkout] = useState(original);
  const prescription = workout.snapshot ?? workout.prescription;
  const [results, setResults] = useState<TrainingResults>(() => original.results ?? initialResults(prescription));
  const [comments, setComments] = useState(initialComments);
  const ownComment = comments.find((comment) => comment.author_id === workout.trainee_id);
  const [body, setBody] = useState(ownComment?.body ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(ownComment?.visibility ?? "public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const valid = today >= plan.valid_from && today <= plan.valid_until;
  const editable = workout.status === "in_progress" || correcting;
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [dirty]);

  async function call<T>(action: string, payload: object): Promise<T> {
    const response = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const json = (await response.json()) as { data?: T; error?: string };
    if (!response.ok || !json.data) {
      if (response.status === 409) setConflict(true);
      throw new Error(json.error ?? "Nie udało się zapisać danych. Spróbuj ponownie.");
    }
    return json.data;
  }

  async function save(action: "start_workout" | "save_results" | "complete_workout" | "correct_workout") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await call<TrainingWorkout>(action, {
        workout_id: workout.id,
        version: workout.version,
        ...(action === "start_workout" ? {} : { results }),
      });
      setWorkout(updated);
      setResults(updated.results ?? initialResults(updated.snapshot ?? updated.prescription));
      setDirty(false);
      setConflict(false);
      setCorrecting(false);
      setNotice(
        action === "start_workout"
          ? "Trening rozpoczęty. Rozpiska została zachowana."
          : action === "complete_workout"
            ? "Trening zakończony. Wyniki są zapisane."
            : action === "correct_workout"
              ? "Korekta zapisana. Oryginalna rozpiska pozostaje bez zmian."
              : "Wyniki zapisane.",
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Brak połączenia. Wyniki pozostają w formularzu.");
    } finally {
      setBusy(false);
    }
  }

  function changeResults(next: TrainingResults) {
    setResults(next);
    setDirty(true);
    setNotice("");
  }

  function changeExercise(id: string, change: Partial<TrainingExerciseResult>) {
    changeResults({
      ...results,
      exercises: results.exercises.map((item) => (item.exercise_id === id ? { ...item, ...change } : item)),
    });
  }

  function changeSet(id: string, index: number, change: Partial<TrainingSetResult>) {
    const exercise = results.exercises.find((item) => item.exercise_id === id);
    if (exercise)
      changeExercise(id, { sets: exercise.sets.map((item, i) => (i === index ? { ...item, ...change } : item)) });
  }

  async function saveComment() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const comment = await call<TrainingComment>("save_comment", { workout_id: workout.id, body, visibility });
      setComments((previous) => [...previous.filter((item) => item.author_id !== comment.author_id), comment]);
      setNotice("Komentarz zapisany.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Nie udało się zapisać komentarza.");
    } finally {
      setBusy(false);
    }
  }

  function exerciseCard(exercise: TrainingExercise, rounds: number | null) {
    const actual = results.exercises.find((item) => item.exercise_id === exercise.id);
    if (!actual) return null;
    const performed = actual.replacement ?? exercise;
    const inSuperset = rounds !== null && actual.replacement === null;
    const changeReplacement = (patch: Partial<TrainingExercise>) => {
      if (actual.replacement) changeExercise(exercise.id, { replacement: { ...actual.replacement, ...patch } });
    };
    return (
      <section key={exercise.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <h3 className="text-xl font-semibold">{exercise.name}</h3>
        {actual.replacement && <p className="mt-2 text-sm font-medium text-slate-300">Oryginalna rozpiska</p>}
        <PrescriptionSummary exercise={exercise} rounds={rounds} />
        {actual.replacement && (
          <div className="mt-4 rounded-xl border border-lime-800 p-3">
            <p className="font-medium text-lime-300">Zamiennik: {actual.replacement.name || "uzupełnij nazwę"}</p>
            <PrescriptionSummary exercise={actual.replacement} />
            {rounds !== null && (
              <p className="mt-2 text-sm text-slate-400">
                Zamiennik rozliczasz w seriach według jego własnego celu. Oryginalna superseria pozostaje w rozpisce
                powyżej.
              </p>
            )}
          </div>
        )}
        {inSuperset && <p className="mt-2 text-sm text-lime-300">Jedna seria tego ćwiczenia w każdej rundzie.</p>}
        {editable && (
          <label className="mt-4 flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={actual.skipped}
              onChange={(event) => {
                changeExercise(exercise.id, {
                  skipped: event.target.checked,
                  ...(event.target.checked ? { replacement: null } : {}),
                });
              }}
              className="size-5 accent-lime-300"
            />
            Pomiń ćwiczenie: {exercise.name}
          </label>
        )}
        {correcting && !actual.skipped && (
          <div className="my-4 rounded-xl border border-slate-600 p-4">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={!!actual.replacement}
                onChange={(event) => {
                  changeExercise(exercise.id, {
                    replacement: event.target.checked
                      ? {
                          ...exercise,
                          id: exercise.id,
                          group_id: null,
                          name: "",
                          sets: {
                            kind: "fixed",
                            min: Math.max(1, actual.sets.length),
                            max: Math.max(1, actual.sets.length),
                          },
                          reps: { kind: "fixed", min: 1, max: 1 },
                          rir: null,
                          rpe: null,
                        }
                      : null,
                  });
                }}
                className="size-5 accent-lime-300"
              />
              Użyto zamiennika zamiast {exercise.name}
            </label>
            {actual.replacement && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-400">
                  Uzupełnij pełny opis zamiennika, wyniki serii i ocenę ćwiczenia poniżej.
                </p>
                <label className="block text-sm text-slate-300">
                  Nazwa zamiennika
                  <input
                    className={inputClass}
                    maxLength={160}
                    value={actual.replacement.name}
                    onChange={(event) => {
                      changeReplacement({ name: event.target.value });
                    }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <NumericField
                    label="Serie zamiennika"
                    value={actual.replacement.sets?.min ?? null}
                    min={1}
                    max={100}
                    integer
                    onChange={(value) => {
                      changeReplacement({ sets: { kind: "fixed", min: value, max: value } });
                    }}
                  />
                  <NumericField
                    label="Powtórzenia zamiennika"
                    value={actual.replacement.reps?.min ?? null}
                    min={1}
                    max={10000}
                    integer
                    onChange={(value) => {
                      changeReplacement({ reps: { kind: "fixed", min: value, max: value } });
                    }}
                  />
                  <NumericField
                    label="RIR zamiennika (lub RPE)"
                    value={actual.replacement.rir}
                    max={10}
                    onChange={(value) => {
                      changeReplacement({ rir: value, ...(value !== null ? { rpe: null } : {}) });
                    }}
                  />
                  <NumericField
                    label="RPE zamiennika (lub RIR)"
                    value={actual.replacement.rpe}
                    min={1}
                    max={10}
                    onChange={(value) => {
                      changeReplacement({ rpe: value, ...(value !== null ? { rir: null } : {}) });
                    }}
                  />
                  <NumericField
                    label="Cel ciężaru zamiennika (kg, opcjonalny)"
                    value={actual.replacement.weight_kg}
                    max={2000}
                    onChange={(value) => {
                      changeReplacement({ weight_kg: value });
                    }}
                  />
                  <NumericField
                    label="Cel czasu zamiennika (s, opcjonalny)"
                    integer
                    value={actual.replacement.duration_seconds}
                    min={1}
                    max={86400}
                    onChange={(value) => {
                      changeReplacement({ duration_seconds: value });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {actual.skipped ? (
          <p className="mt-4 text-amber-200">Ćwiczenie pominięte.</p>
        ) : (
          <>
            {actual.replacement && !correcting && (
              <p className="mt-4 text-lime-300">Wykonano zamiennik: {actual.replacement.name}</p>
            )}
            <div className="mt-4 space-y-3">
              {actual.sets.map((set, index) => (
                <fieldset key={index} className="rounded-xl border border-slate-700 p-3" disabled={!editable || busy}>
                  <legend className="px-2 text-sm font-medium">
                    {inSuperset ? "Runda" : "Seria"} {index + 1} · {performed.name || exercise.name}
                  </legend>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={set.skipped}
                        onChange={(event) => {
                          changeSet(exercise.id, index, { skipped: event.target.checked });
                        }}
                        className="size-4 accent-lime-300"
                      />
                      Pominięta seria
                    </label>
                    {editable && actual.sets.length > 1 && (
                      <button
                        type="button"
                        className="min-h-11 px-2 text-sm text-slate-300 underline"
                        onClick={() => {
                          changeExercise(exercise.id, { sets: actual.sets.filter((_, i) => i !== index) });
                        }}
                      >
                        Usuń serię {index + 1}
                      </button>
                    )}
                  </div>
                  {!set.skipped && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {performed.duration_seconds !== null && (
                        <NumericField
                          label="Czas (sekundy)"
                          integer
                          value={set.duration_seconds}
                          min={1}
                          max={86400}
                          onChange={(value) => {
                            changeSet(exercise.id, index, { duration_seconds: value });
                          }}
                        />
                      )}
                      {performed.reps !== null && (
                        <NumericField
                          label="Powtórzenia"
                          value={set.reps}
                          max={10000}
                          integer
                          onChange={(value) => {
                            changeSet(exercise.id, index, { reps: value });
                          }}
                        />
                      )}
                      {performed.weight_kg !== null && (
                        <NumericField
                          label="Ciężar (kg)"
                          value={set.weight_kg}
                          max={2000}
                          onChange={(value) => {
                            changeSet(exercise.id, index, { weight_kg: value });
                          }}
                        />
                      )}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
            {editable && (
              <button
                type="button"
                disabled={busy || actual.sets.length >= 100}
                className={cn(buttonClass, "mt-3")}
                onClick={() => {
                  changeExercise(exercise.id, { sets: [...actual.sets, blankSet()] });
                }}
              >
                Dodaj serię · {exercise.name}
              </button>
            )}
            <fieldset disabled={!editable || busy} className="mt-4 max-w-xs">
              <NumericField
                label={`Ocena ćwiczenia ${exercise.name} (1–10)`}
                value={actual.rating}
                min={1}
                max={10}
                integer
                onChange={(value) => {
                  changeExercise(exercise.id, { rating: value });
                }}
              />
            </fieldset>
          </>
        )}
      </section>
    );
  }

  return (
    <fieldset disabled={busy || !hydrated} className="min-w-0 space-y-6">
      <legend className="sr-only">Wykonanie treningu i komentarze</legend>
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <p className="font-semibold text-lime-300">
          {workout.status === "planned" ? "Zaplanowany" : workout.status === "in_progress" ? "W trakcie" : "Zakończony"}
        </p>
        {workout.corrected_at && (
          <p className="mt-1 text-sm text-slate-400">
            Ostatnia korekta: {new Date(workout.corrected_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}
          </p>
        )}
        {workout.status === "planned" ? (
          <>
            <p className="my-3 text-slate-300">
              Rozpoczęcie zachowuje aktualną rozpiskę. Późniejsze zmiany trenera nie zmienią tego treningu.
            </p>
            {!valid && (
              <p className="mb-3 text-amber-200">Plan nie jest obecnie ważny. Nowego treningu nie można rozpocząć.</p>
            )}
            <button
              type="button"
              disabled={busy || !valid}
              className={primaryClass}
              onClick={() => save("start_workout")}
            >
              Rozpocznij trening
            </button>
          </>
        ) : workout.status === "completed" && !correcting ? (
          <button
            type="button"
            className={cn(buttonClass, "mt-3")}
            onClick={() => {
              setCorrecting(true);
              setNotice("");
            }}
          >
            Popraw wyniki treningu
          </button>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            {correcting
              ? "Tryb korekty. Oryginalna rozpiska pozostaje zachowana."
              : "Zapisuj wyniki przyciskiem poniżej. Możesz kontynuować także po wygaśnięciu planu."}
          </p>
        )}
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400 bg-red-950 p-4 text-red-100">
          {error}
          {conflict && (
            <p className="mt-2">
              Dane zmieniły się w innym oknie. Twoje wpisy są nadal w formularzu. Przed odświeżeniem zachowaj je,
              następnie{" "}
              <a className="underline" href={`/dashboard/training/${workout.id}`}>
                wczytaj aktualny trening
              </a>
              .
            </p>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-lime-600 bg-lime-950 p-4 text-lime-100">
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Rozgrzewka</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-300">
          {prescription.warmup || "Rozgrzewka według własnego przygotowania."}
        </p>
        <fieldset disabled={!editable || busy} className="mt-4 flex flex-wrap gap-4">
          <legend className="mb-2 text-sm text-slate-400">Rozliczenie rozgrzewki</legend>
          {(
            [
              ["done", "Rozgrzewka wykonana"],
              ["skipped", "Rozgrzewka pominięta"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="warmup-status"
                checked={results.warmup_status === value}
                onChange={() => {
                  changeResults({ ...results, warmup_status: value });
                }}
                className="size-5 accent-lime-300"
              />
              {label}
            </label>
          ))}
        </fieldset>
      </section>

      <div className="space-y-6">
        {prescription.exercises.map((exercise, index) => {
          const group = prescription.supersets.find((item) => item.id === exercise.group_id);
          if (!group) return exerciseCard(exercise, null);
          if (prescription.exercises.findIndex((item) => item.group_id === group.id) !== index) return null;
          return (
            <section key={group.id} className="space-y-3 rounded-2xl border border-lime-800 bg-slate-950 p-3 sm:p-4">
              <h2 className="text-xl font-semibold text-lime-300">Superseria: {group.name}</h2>
              <p className="text-sm text-slate-300">
                {group.rounds} rund · Przerwa między ćwiczeniami: {group.rest_between_exercises || "brak"} · Przerwa
                między rundami: {group.rest_between_rounds || "brak"}
              </p>
              {prescription.exercises
                .filter((item) => item.group_id === group.id)
                .map((item) => exerciseCard(item, group.rounds))}
            </section>
          );
        })}
      </div>

      {workout.status !== "planned" && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <fieldset disabled={!editable || busy} className="max-w-xs">
            <NumericField
              label="Ocena całego treningu (1–10)"
              value={results.rating}
              min={1}
              max={10}
              integer
              onChange={(value) => {
                changeResults({ ...results, rating: value });
              }}
            />
          </fieldset>
          {editable && (
            <>
              <p className="mt-4 text-sm text-slate-400">
                {dirty
                  ? "Masz niezapisane zmiany. Zapisz je przed opuszczeniem strony."
                  : "Zapisz wszystkie serie, rozlicz rozgrzewkę i oceń wykonane ćwiczenia przed zakończeniem."}{" "}
                Odchylenia od planowanej liczby serii i powtórzeń są dozwolone.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {correcting ? (
                  <>
                    <button
                      disabled={busy}
                      type="button"
                      className={primaryClass}
                      onClick={() => save("correct_workout")}
                    >
                      Zapisz korektę
                    </button>
                    <button
                      disabled={busy}
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setCorrecting(false);
                        setResults(workout.results ?? initialResults(prescription));
                        setDirty(false);
                        setError("");
                      }}
                    >
                      Anuluj korektę
                    </button>
                  </>
                ) : (
                  <>
                    <button disabled={busy} type="button" className={buttonClass} onClick={() => save("save_results")}>
                      Zapisz wyniki
                    </button>
                    <button
                      disabled={busy}
                      type="button"
                      className={primaryClass}
                      onClick={() => save("complete_workout")}
                    >
                      Zakończ trening
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Komentarz do treningu</h2>
        <p className="mt-2 text-sm text-slate-400">
          Publiczny komentarz widzi Twój trener. Prywatny jest widoczny wyłącznie dla Ciebie.
        </p>
        <label className="mt-4 block text-sm text-slate-300">
          Twój komentarz
          <textarea
            rows={4}
            maxLength={5000}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
            className={inputClass}
          />
        </label>
        <label className="mt-3 block max-w-xs text-sm text-slate-300">
          Widoczność komentarza
          <select
            className={inputClass}
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value as "public" | "private");
            }}
          >
            <option value="public">Publiczny — dla trenera</option>
            <option value="private">Prywatny — tylko dla mnie</option>
          </select>
        </label>
        <button type="button" disabled={busy || !body.trim()} className={cn(buttonClass, "mt-4")} onClick={saveComment}>
          Zapisz komentarz
        </button>
        {ownComment && (
          <p className="mt-3 text-sm text-slate-400">
            Zapisany komentarz: {ownComment.visibility === "private" ? "prywatny" : "publiczny"} ·{" "}
            {new Date(ownComment.updated_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}
          </p>
        )}
      </section>
    </fieldset>
  );
}
