import { useState, type ReactNode } from "react";
import type { Profile } from "@/lib/access";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import type {
  TrainingExercise,
  TrainingPlan,
  TrainingPrescription,
  TrainingSuperset,
  TrainingTarget,
  TrainingWorkout,
} from "@/lib/training-contract";

interface Props {
  plans: TrainingPlan[];
  workouts: TrainingWorkout[];
  trainees: Profile[];
  initialTraineeId?: string;
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300/30 disabled:opacity-50";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 disabled:cursor-wait disabled:opacity-50";
const primaryClass = "border-lime-300 bg-lime-300 text-slate-950 hover:bg-lime-200 disabled:hover:bg-lime-300";
const statusLabels = { planned: "Zaplanowany", in_progress: "W trakcie", completed: "Zakończony" };

function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monday(date: string): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

function addDays(date: string, count: number): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("pl-PL");
}

function numeric(value: string): number | null {
  return value === "" ? null : Number(value);
}

async function save<T>(action: string, payload: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw new Error("Nie udało się połączyć. Dane nie zostały zapisane. Spróbuj ponownie.");
  }
  const result = (await response.json()) as { data?: T; error?: string };
  if (response.status === 409)
    throw new Error("Trening został zmieniony lub rozpoczęty. Odśwież stronę przed kolejną edycją.");
  if (!response.ok || !result.data) throw new Error(result.error ?? "Nie udało się zapisać danych. Spróbuj ponownie.");
  return result.data;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-sm font-medium text-slate-300">
      {label}
      {children}
    </label>
  );
}

function TargetEditor({
  label,
  value,
  onChange,
  allowNull = false,
}: {
  label: string;
  value: TrainingTarget | null;
  onChange: (value: TrainingTarget | null) => void;
  allowNull?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
      <Field label={label}>
        <select
          className={inputClass}
          value={value?.kind ?? "none"}
          onChange={(event) => {
            const kind = event.target.value;
            if (kind === "none") onChange(null);
            else if (kind === "unlimited") onChange({ kind, min: null, max: null });
            else if (kind === "fixed") onChange({ kind, min: value?.min ?? 1, max: value?.min ?? 1 });
            else onChange({ kind: "range", min: value?.min ?? 1, max: value?.max ?? value?.min ?? 1 });
          }}
        >
          {allowNull && <option value="none">Nie określono — jedno wykonanie</option>}
          <option value="fixed">Konkretna liczba</option>
          <option value="range">Zakres</option>
          <option value="unlimited">Bez limitu</option>
        </select>
      </Field>
      {value && value.kind !== "unlimited" && (
        <Field label={value.kind === "range" ? `${label}: minimum` : `${label}: liczba`}>
          <input
            className={inputClass}
            type="number"
            min="1"
            step="1"
            required
            value={value.min ?? ""}
            onChange={(event) => {
              const min = numeric(event.target.value);
              onChange({ ...value, min, max: value.kind === "fixed" ? min : value.max });
            }}
          />
        </Field>
      )}
      {value?.kind === "range" && (
        <Field label={`${label}: maksimum`}>
          <input
            className={inputClass}
            type="number"
            min={value.min ?? 1}
            step="1"
            required
            value={value.max ?? ""}
            onChange={(event) => {
              onChange({ ...value, max: numeric(event.target.value) });
            }}
          />
        </Field>
      )}
    </div>
  );
}

function newExercise(): TrainingExercise {
  return {
    id: crypto.randomUUID(),
    name: "",
    sets: { kind: "fixed", min: 3, max: 3 },
    reps: { kind: "fixed", min: 10, max: 10 },
    weight_kg: null,
    duration_seconds: null,
    rir: null,
    rpe: null,
    notes: "",
    group_id: null,
  };
}

function ExerciseEditor({
  exercise,
  index,
  total,
  groups,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: TrainingExercise;
  index: number;
  total: number;
  groups: TrainingSuperset[];
  onChange: (exercise: TrainingExercise) => void;
  onMove: (direction: number) => void;
  onRemove: () => void;
}) {
  const timed = exercise.duration_seconds !== null;
  return (
    <fieldset className="min-w-0 space-y-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4 sm:p-5">
      <legend className="px-2 font-semibold text-lime-300">Ćwiczenie {index + 1}</legend>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nazwa ćwiczenia">
          <input
            className={inputClass}
            value={exercise.name}
            maxLength={160}
            required
            placeholder="np. Przysiad ze sztangą"
            onChange={(event) => {
              onChange({ ...exercise, name: event.target.value });
            }}
          />
        </Field>
        <Field label="Superseria">
          <select
            className={inputClass}
            value={exercise.group_id ?? ""}
            onChange={(event) => {
              onChange({ ...exercise, group_id: event.target.value || null, sets: null });
            }}
          >
            <option value="">Ćwiczenie samodzielne</option>
            {groups.map((group, groupIndex) => (
              <option key={group.id} value={group.id}>
                {group.name || `Superseria ${groupIndex + 1}`} — {group.rounds} rund
              </option>
            ))}
          </select>
        </Field>
      </div>
      {exercise.group_id ? (
        <p className="rounded-lg bg-lime-300/10 p-3 text-sm text-lime-200">
          Jedna runda superserii to jedna seria tego ćwiczenia. Obowiązuje liczba rund grupy.
        </p>
      ) : (
        <TargetEditor
          label="Serie"
          value={exercise.sets}
          allowNull
          onChange={(sets) => {
            onChange({ ...exercise, sets });
          }}
        />
      )}
      <Field label="Sposób rozliczania">
        <select
          className={inputClass}
          value={timed ? "time" : "reps"}
          onChange={(event) => {
            onChange({
              ...exercise,
              duration_seconds: event.target.value === "time" ? 30 : null,
              reps: event.target.value === "time" ? null : { kind: "fixed", min: 10, max: 10 },
            });
          }}
        >
          <option value="reps">Powtórzenia</option>
          <option value="time">Czas</option>
        </select>
      </Field>
      {timed ? (
        <Field label="Czas trwania (sekundy)">
          <input
            className={inputClass}
            type="number"
            min="1"
            step="1"
            required
            value={exercise.duration_seconds ?? ""}
            onChange={(event) => {
              onChange({ ...exercise, duration_seconds: numeric(event.target.value) ?? 0 });
            }}
          />
        </Field>
      ) : (
        <TargetEditor
          label="Powtórzenia"
          value={exercise.reps}
          onChange={(reps) => {
            onChange({ ...exercise, reps });
          }}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Ciężar (kg, opcjonalnie)">
          <input
            className={inputClass}
            type="number"
            min="0"
            step="any"
            value={exercise.weight_kg ?? ""}
            onChange={(event) => {
              onChange({ ...exercise, weight_kg: numeric(event.target.value) });
            }}
          />
        </Field>
        <Field label="RIR (opcjonalnie)">
          <input
            className={inputClass}
            type="number"
            min="0"
            max="10"
            step="1"
            value={exercise.rir ?? ""}
            onChange={(event) => {
              onChange({ ...exercise, rir: numeric(event.target.value) });
            }}
          />
        </Field>
        <Field label="RPE (opcjonalnie)">
          <input
            className={inputClass}
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={exercise.rpe ?? ""}
            onChange={(event) => {
              onChange({ ...exercise, rpe: numeric(event.target.value) });
            }}
          />
        </Field>
      </div>
      <Field label="Uwagi do ćwiczenia">
        <textarea
          className={inputClass}
          rows={2}
          maxLength={2000}
          value={exercise.notes}
          onChange={(event) => {
            onChange({ ...exercise, notes: event.target.value });
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          type="button"
          disabled={index === 0}
          onClick={() => {
            onMove(-1);
          }}
          aria-label={`Przesuń ćwiczenie ${index + 1} w górę`}
        >
          ↑ W górę
        </button>
        <button
          className={buttonClass}
          type="button"
          disabled={index === total - 1}
          onClick={() => {
            onMove(1);
          }}
          aria-label={`Przesuń ćwiczenie ${index + 1} w dół`}
        >
          ↓ W dół
        </button>
        <button
          className={cn(buttonClass, "text-rose-300")}
          type="button"
          onClick={onRemove}
          aria-label={`Usuń ćwiczenie ${index + 1}`}
        >
          Usuń ćwiczenie
        </button>
      </div>
    </fieldset>
  );
}

interface EditorDraft {
  key: string;
  workout: TrainingWorkout | null;
  prescription: TrainingPrescription;
  unitLabel: string;
  date: string;
}

function WorkoutEditor({
  plan,
  draft,
  onSaved,
  onCancel,
}: {
  plan: TrainingPlan;
  draft: EditorDraft;
  onSaved: (workout: TrainingWorkout) => void;
  onCancel: () => void;
}) {
  const [prescription, setPrescription] = useState(draft.prescription);
  const [date, setDate] = useState(draft.date);
  const [unitLabel, setUnitLabel] = useState(draft.unitLabel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const earliest = draft.workout ? [plan.valid_from, draft.workout.week_start].sort().at(-1) : plan.valid_from;
  const latest = draft.workout ? [plan.valid_until, addDays(draft.workout.week_start, 6)].sort()[0] : plan.valid_until;

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!prescription.exercises.length) {
      setError("Dodaj co najmniej jedno ćwiczenie części właściwej.");
      return;
    }
    const incompleteGroup = prescription.supersets.find(
      (group) => prescription.exercises.filter((exercise) => exercise.group_id === group.id).length < 2,
    );
    if (incompleteGroup) {
      setError(`Przypisz co najmniej dwa ćwiczenia do superserii „${incompleteGroup.name}” albo usuń tę grupę.`);
      return;
    }
    setBusy(true);
    try {
      const workout = await save<TrainingWorkout>(draft.workout ? "update_workout" : "create_workout", {
        ...(draft.workout
          ? { workout_id: draft.workout.id, version: draft.workout.version }
          : { plan_id: plan.id, week_start: monday(date) }),
        scheduled_for: date,
        unit_label: unitLabel,
        prescription,
      });
      onSaved(workout);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się zapisać treningu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-lime-300/40 bg-slate-900 p-5 sm:p-7"
      aria-labelledby="workout-editor-title"
    >
      <h2 id="workout-editor-title" className="text-2xl font-semibold">
        {draft.workout ? "Edytuj zaplanowany trening" : "Nowy trening"}
      </h2>
      <p className="mt-2 text-sm text-slate-300">{plan.title}. Każde wystąpienie jednostki ma własne parametry.</p>
      {draft.workout && (
        <p className="mt-2 text-sm text-amber-200">
          Edytujesz tylko tę jednostkę w tygodniu od {formatDate(draft.workout.week_start)}.
        </p>
      )}
      <form className="mt-6 space-y-7" onSubmit={submit}>
        <fieldset disabled={busy} className="min-w-0 space-y-7 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa jednostki">
              <input
                className={inputClass}
                required
                maxLength={120}
                value={unitLabel}
                placeholder="np. Trening A"
                onChange={(event) => {
                  setUnitLabel(event.target.value);
                }}
              />
            </Field>
            <Field label="Data treningu">
              <input
                className={inputClass}
                required
                type="date"
                min={earliest}
                max={latest}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                }}
              />
            </Field>
          </div>
          {date && (
            <p className="text-sm text-slate-400">
              Tydzień od {formatDate(monday(date))} do {formatDate(addDays(monday(date), 6))}
            </p>
          )}
          <Field label="Rozgrzewka">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={4000}
              placeholder="np. 5 min roweru, mobilizacja bioder i barków"
              value={prescription.warmup}
              onChange={(event) => {
                setPrescription({ ...prescription, warmup: event.target.value });
              }}
            />
          </Field>
          <p className="-mt-4 text-sm text-slate-400">Podopieczny oznaczy całą rozgrzewkę jednym statusem.</p>
          <section aria-labelledby="supersets-title" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="supersets-title" className="text-lg font-semibold">
                Superserie
              </h3>
              <button
                className={buttonClass}
                type="button"
                onClick={() => {
                  setPrescription({
                    ...prescription,
                    supersets: [
                      ...prescription.supersets,
                      {
                        id: crypto.randomUUID(),
                        name: `Superseria ${prescription.supersets.length + 1}`,
                        rounds: 3,
                        rest_between_exercises: "",
                        rest_between_rounds: "",
                      },
                    ],
                  });
                }}
              >
                Dodaj superserię
              </button>
            </div>
            {prescription.supersets.map((group, index) => {
              const changeGroup = (next: TrainingSuperset) => {
                setPrescription({
                  ...prescription,
                  supersets: prescription.supersets.map((item) => (item.id === group.id ? next : item)),
                });
              };
              return (
                <fieldset key={group.id} className="min-w-0 rounded-xl border border-lime-300/30 p-4">
                  <legend className="px-2 text-sm text-lime-200">Superseria {index + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nazwa superserii">
                      <input
                        className={inputClass}
                        required
                        maxLength={120}
                        value={group.name}
                        onChange={(event) => {
                          changeGroup({ ...group, name: event.target.value });
                        }}
                      />
                    </Field>
                    <Field label="Liczba rund">
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={group.rounds || ""}
                        onChange={(event) => {
                          changeGroup({ ...group, rounds: Number(event.target.value) });
                        }}
                      />
                    </Field>
                    <Field label="Przerwa między ćwiczeniami">
                      <input
                        className={inputClass}
                        maxLength={500}
                        placeholder="np. 30 s lub do tętna 120"
                        value={group.rest_between_exercises}
                        onChange={(event) => {
                          changeGroup({ ...group, rest_between_exercises: event.target.value });
                        }}
                      />
                    </Field>
                    <Field label="Przerwa między rundami">
                      <input
                        className={inputClass}
                        maxLength={500}
                        placeholder="np. do całkowitego wypoczynku"
                        value={group.rest_between_rounds}
                        onChange={(event) => {
                          changeGroup({ ...group, rest_between_rounds: event.target.value });
                        }}
                      />
                    </Field>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    Przypisz poniżej co najmniej dwa ćwiczenia do grupy. Ich kolejność na liście jest kolejnością
                    wykonania w rundzie. Cała superseria jest wykonywana w miejscu jej pierwszego ćwiczenia.
                  </p>
                  <button
                    className={cn(buttonClass, "mt-3 text-rose-300")}
                    type="button"
                    onClick={() => {
                      setPrescription({
                        ...prescription,
                        supersets: prescription.supersets.filter((item) => item.id !== group.id),
                        exercises: prescription.exercises.map((item) =>
                          item.group_id === group.id ? { ...item, group_id: null, sets: null } : item,
                        ),
                      });
                    }}
                  >
                    Usuń superserię {index + 1}
                  </button>
                </fieldset>
              );
            })}
          </section>
          <section aria-labelledby="exercises-title" className="space-y-5">
            <h3 id="exercises-title" className="text-lg font-semibold">
              Część właściwa
            </h3>
            {prescription.exercises.map((exercise, index) => (
              <ExerciseEditor
                key={exercise.id}
                exercise={exercise}
                index={index}
                total={prescription.exercises.length}
                groups={prescription.supersets}
                onChange={(next) => {
                  setPrescription({
                    ...prescription,
                    exercises: prescription.exercises.map((item) => (item.id === exercise.id ? next : item)),
                  });
                }}
                onRemove={() => {
                  setPrescription({
                    ...prescription,
                    exercises: prescription.exercises.filter((item) => item.id !== exercise.id),
                  });
                }}
                onMove={(direction) => {
                  const exercises = [...prescription.exercises];
                  const moved = exercises.splice(index, 1)[0];
                  exercises.splice(index + direction, 0, moved);
                  setPrescription({ ...prescription, exercises });
                }}
              />
            ))}
            <button
              className={buttonClass}
              type="button"
              onClick={() => {
                setPrescription({ ...prescription, exercises: [...prescription.exercises, newExercise()] });
              }}
            >
              Dodaj ćwiczenie
            </button>
          </section>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-lg border border-rose-400/40 bg-rose-950/40 p-4 text-rose-200">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={cn(buttonClass, primaryClass)} disabled={busy}>
            {busy ? "Zapisywanie…" : "Zapisz trening"}
          </button>
          <button type="button" className={buttonClass} disabled={busy} onClick={onCancel}>
            Anuluj
          </button>
        </div>
      </form>
    </section>
  );
}

export default function TrainingManager({
  plans: initialPlans,
  workouts: initialWorkouts,
  trainees,
  initialTraineeId = "",
}: Props) {
  const hydrated = useHydrated();
  const [plans, setPlans] = useState(initialPlans);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [traineeFilter, setTraineeFilter] = useState(initialTraineeId);
  const [planId, setPlanId] = useState(
    initialPlans.find((plan) => !initialTraineeId || plan.trainee_id === initialTraineeId)?.id ?? "",
  );
  const [planTraineeId, setPlanTraineeId] = useState(initialTraineeId || trainees[0]?.id || "");
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const visiblePlans = plans.filter((plan) => !traineeFilter || plan.trainee_id === traineeFilter);
  const plan = visiblePlans.find((item) => item.id === planId) ?? visiblePlans.at(0);
  const person = trainees.find((trainee) => trainee.id === plan?.trainee_id);
  const planWorkouts = workouts
    .filter((workout) => workout.plan_id === plan?.id)
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for) || a.created_at.localeCompare(b.created_at));
  const weeks = [...new Set(planWorkouts.map((workout) => workout.week_start))].sort();

  async function createPlan(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name: string): string => {
      const entry = values.get(name);
      return typeof entry === "string" ? entry : "";
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await save<TrainingPlan>("create_plan", {
        trainee_id: planTraineeId,
        title: value("title"),
        valid_from: value("valid_from"),
        valid_until: value("valid_until"),
      });
      setPlans([...plans, created]);
      setPlanId(created.id);
      setTraineeFilter(created.trainee_id);
      setDraft(null);
      setNotice("Plan został utworzony. Dodaj pierwszą jednostkę treningową.");
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się utworzyć planu.");
    } finally {
      setBusy(false);
    }
  }

  function openEditor(workout: TrainingWorkout | null, copy = false) {
    if (!plan) return;
    const today = localDate();
    const defaultDate = today < plan.valid_from ? plan.valid_from : today > plan.valid_until ? plan.valid_until : today;
    setDraft({
      key: crypto.randomUUID(),
      workout: copy ? null : workout,
      prescription: workout
        ? structuredClone(workout.snapshot ?? workout.prescription)
        : { warmup: "", exercises: [newExercise()], supersets: [] },
      unitLabel: workout?.unit_label ?? "",
      date: workout && !copy ? workout.scheduled_for : defaultDate,
    });
    setDeleteId(null);
    setNotice("");
    setError("");
  }

  async function removeWorkout(workout: TrainingWorkout) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await save<{ id: string }>("delete_workout", { workout_id: workout.id, version: workout.version });
      setWorkouts(workouts.filter((item) => item.id !== workout.id));
      setDeleteId(null);
      setNotice("Zaplanowany trening został usunięty.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się usunąć treningu.");
    } finally {
      setBusy(false);
    }
  }

  if (!trainees.length)
    return (
      <p className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300">
        Nie masz jeszcze przypisanych podopiecznych. Po przypisaniu osoby przez operatora utworzysz dla niej plan.
      </p>
    );

  return (
    <fieldset disabled={!hydrated} className="min-w-0 space-y-8">
      <legend className="sr-only">Planowanie treningów</legend>
      <details
        className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
        open={plans.length === 0 || undefined}
      >
        <summary className="cursor-pointer rounded text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300">
          Utwórz plan
        </summary>
        <form aria-label="Nowy plan treningowy" className="mt-5 space-y-4" onSubmit={createPlan}>
          <fieldset disabled={busy || Boolean(draft)} className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Podopieczny">
              <select
                className={inputClass}
                required
                value={planTraineeId}
                onChange={(event) => {
                  setPlanTraineeId(event.target.value);
                }}
              >
                {trainees.map((trainee) => (
                  <option key={trainee.id} value={trainee.id}>
                    {trainee.display_name} · {trainee.identification_label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nazwa planu">
              <input
                className={inputClass}
                name="title"
                required
                maxLength={160}
                placeholder="np. Budowanie siły — jesień"
              />
            </Field>
            <Field label="Ważny od">
              <input className={inputClass} name="valid_from" type="date" required />
            </Field>
            <Field label="Ważny do">
              <input className={inputClass} name="valid_until" type="date" required />
            </Field>
          </fieldset>
          <button className={cn(buttonClass, primaryClass)} type="submit" disabled={busy || Boolean(draft)}>
            {busy ? "Zapisywanie…" : "Utwórz plan"}
          </button>
        </form>
      </details>
      {error && (
        <p role="alert" className="rounded-lg border border-rose-400/40 bg-rose-950/40 p-4 text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-lime-300/30 bg-lime-300/10 p-4 text-lime-200">
          {notice}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Filtruj po podopiecznym">
          <select
            className={inputClass}
            value={traineeFilter}
            disabled={Boolean(draft)}
            onChange={(event) => {
              setTraineeFilter(event.target.value);
              setPlanId("");
            }}
          >
            <option value="">Wszyscy podopieczni</option>
            {trainees.map((trainee) => (
              <option key={trainee.id} value={trainee.id}>
                {trainee.display_name} · {trainee.identification_label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan treningowy">
          <select
            className={inputClass}
            value={plan?.id ?? ""}
            disabled={Boolean(draft) || !visiblePlans.length}
            onChange={(event) => {
              setPlanId(event.target.value);
            }}
          >
            {!visiblePlans.length && <option value="">Brak planów</option>}
            {visiblePlans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {trainees.find((trainee) => trainee.id === item.trainee_id)?.display_name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {plan ? (
        <>
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-lime-300">
                  {person?.display_name} · {person?.identification_label}
                </p>
                <h2 className="mt-2 text-2xl font-semibold break-words">{plan.title}</h2>
                <p className="mt-3 text-sm text-slate-300">
                  Ważność: {formatDate(plan.valid_from)} – {formatDate(plan.valid_until)}
                </p>
              </div>
              <button
                className={cn(buttonClass, primaryClass)}
                disabled={Boolean(draft) || busy}
                onClick={() => {
                  openEditor(null);
                }}
              >
                Dodaj trening
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Rozpoczęte i zakończone treningi zachowują swoją rozpiskę. Powtarzana jednostka jest konfigurowana osobno.
            </p>
          </section>
          {draft && (
            <WorkoutEditor
              key={draft.key}
              plan={plan}
              draft={draft}
              onCancel={() => {
                setDraft(null);
              }}
              onSaved={(saved) => {
                setWorkouts((previous) => [...previous.filter((item) => item.id !== saved.id), saved]);
                setDraft(null);
                setNotice("Trening został zapisany.");
              }}
            />
          )}
          {!planWorkouts.length && (
            <p className="py-6 text-slate-400">
              Ten plan nie ma jeszcze treningów. Wybierz „Dodaj trening”, aby rozpisać pierwszą jednostkę.
            </p>
          )}
          {weeks.map((week) => (
            <section key={week} aria-label={`Tydzień od ${formatDate(week)}`}>
              <h3 className="mb-4 text-lg font-semibold">
                Tydzień {formatDate(week)} – {formatDate(addDays(week, 6))}
              </h3>
              <ul className="space-y-3">
                {planWorkouts
                  .filter((workout) => workout.week_start === week)
                  .map((workout) => (
                    <li key={workout.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-400">{formatDate(workout.scheduled_for)}</p>
                          <h4 className="mt-1 text-xl font-semibold break-words">{workout.unit_label}</h4>
                          <p className="mt-2 text-sm text-slate-300">
                            {(workout.snapshot ?? workout.prescription).exercises.length} ćwiczeń ·{" "}
                            {statusLabels[workout.status]}
                            {workout.corrected_at && " · Poprawiony"}
                          </p>
                        </div>
                        <a href={`/dashboard/training/${workout.id}`} className={cn(buttonClass, "text-lime-300")}>
                          Otwórz trening
                        </a>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {workout.status === "planned" && (
                          <>
                            <button
                              className={buttonClass}
                              disabled={Boolean(draft) || busy}
                              onClick={() => {
                                openEditor(workout);
                              }}
                            >
                              Edytuj trening
                            </button>
                            <button
                              className={cn(buttonClass, "text-rose-300")}
                              disabled={Boolean(draft) || busy}
                              onClick={() => {
                                setDeleteId(workout.id);
                              }}
                            >
                              Usuń trening
                            </button>
                          </>
                        )}
                        <button
                          className={buttonClass}
                          disabled={Boolean(draft) || busy}
                          onClick={() => {
                            openEditor(workout, true);
                          }}
                        >
                          Powtórz jednostkę
                        </button>
                      </div>
                      {deleteId === workout.id && (
                        <div className="mt-4 rounded-lg border border-rose-400/40 p-4">
                          <p className="text-sm text-slate-200">
                            Usunąć zaplanowany trening „{workout.unit_label}” z {formatDate(workout.scheduled_for)}?
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className={cn(buttonClass, "border-rose-400 text-rose-200")}
                              disabled={busy}
                              onClick={async () => {
                                await removeWorkout(workout);
                              }}
                            >
                              Potwierdź usunięcie
                            </button>
                            <button
                              className={buttonClass}
                              disabled={busy}
                              onClick={() => {
                                setDeleteId(null);
                              }}
                            >
                              Zachowaj trening
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <p className="py-6 text-slate-400">Brak planów dla wybranej osoby. Utwórz plan powyżej.</p>
      )}
    </fieldset>
  );
}
