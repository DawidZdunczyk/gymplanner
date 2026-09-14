import type {
  TrainingComment,
  TrainingExercise,
  TrainingExerciseResult,
  TrainingSetResult,
  TrainingTarget,
  TrainingWorkout,
} from "@/lib/training-contract";
import { cn } from "@/lib/utils";

interface Props {
  workout: TrainingWorkout;
  comments: TrainingComment[];
}

const number = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

function targetLabel(target: TrainingTarget | null, fallback = "—"): string {
  if (!target) return fallback;
  if (target.kind === "unlimited") return "Bez limitu";
  if (target.kind === "range") return `${number.format(target.min ?? 0)}–${number.format(target.max ?? 0)}`;
  return number.format(target.min ?? 0);
}

function delta(actual: number | null, target: TrainingTarget | number | null): string {
  if (actual === null || target === null || (typeof target !== "number" && target.kind === "unlimited")) return "—";
  const min = typeof target === "number" ? target : target.min;
  const max = typeof target === "number" ? target : (target.max ?? target.min);
  if (min === null || max === null) return "—";
  if (actual >= min && actual <= max)
    return typeof target !== "number" && target.kind === "range" ? "W zakresie" : "Zgodnie z planem";
  const difference = actual < min ? actual - min : actual - max;
  return `${difference > 0 ? "+" : ""}${number.format(difference)}${typeof target !== "number" && target.kind === "range" ? " względem zakresu" : ""}`;
}

function PlanParameters({ exercise, rounds }: { exercise: TrainingExercise; rounds?: number }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
      <div>
        <dt className="text-slate-400">{rounds ? "Serie z rund superserii" : "Serie"}</dt>
        <dd className="mt-1 font-medium">{rounds ?? targetLabel(exercise.sets, "Jedno wykonanie")}</dd>
      </div>
      {exercise.reps && (
        <div>
          <dt className="text-slate-400">Powtórzenia</dt>
          <dd className="mt-1 font-medium">{targetLabel(exercise.reps)}</dd>
        </div>
      )}
      {exercise.duration_seconds !== null && (
        <div>
          <dt className="text-slate-400">Czas</dt>
          <dd className="mt-1 font-medium">{number.format(exercise.duration_seconds)} s</dd>
        </div>
      )}
      {exercise.weight_kg !== null && (
        <div>
          <dt className="text-slate-400">Ciężar</dt>
          <dd className="mt-1 font-medium">{number.format(exercise.weight_kg)} kg</dd>
        </div>
      )}
      {exercise.rir !== null && (
        <div>
          <dt className="text-slate-400">RIR</dt>
          <dd className="mt-1 font-medium">{number.format(exercise.rir)}</dd>
        </div>
      )}
      {exercise.rpe !== null && (
        <div>
          <dt className="text-slate-400">RPE</dt>
          <dd className="mt-1 font-medium">{number.format(exercise.rpe)}</dd>
        </div>
      )}
      {exercise.notes && (
        <div className="col-span-2">
          <dt className="text-slate-400">Uwagi</dt>
          <dd className="mt-1 break-words whitespace-pre-wrap">{exercise.notes}</dd>
        </div>
      )}
    </dl>
  );
}

function SetValue({
  label,
  actual,
  unit,
  difference,
}: {
  label: string;
  actual: number | null;
  unit: string;
  difference: string | null;
}) {
  const changed =
    difference !== null && difference !== "—" && difference !== "W zakresie" && difference !== "Zgodnie z planem";
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1">{actual === null ? "Brak wyniku" : `${number.format(actual)}${unit}`}</dd>
      {difference !== null && (
        <dd className={cn("mt-1 text-xs", changed ? "font-medium text-amber-200" : "text-slate-400")}>{difference}</dd>
      )}
    </div>
  );
}

function SetRow({
  set,
  index,
  exercise,
  compare,
}: {
  set: TrainingSetResult;
  index: number;
  exercise: TrainingExercise;
  compare: boolean;
}) {
  return (
    <li className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
      <p className="mb-3 text-sm font-medium text-slate-300">
        Seria {index + 1}
        {set.skipped ? " · Pominięta" : ""}
      </p>
      {!set.skipped && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(exercise.reps !== null || set.reps !== null) && (
            <SetValue
              label="Powtórzenia"
              actual={set.reps}
              unit=""
              difference={compare ? delta(set.reps, exercise.reps) : null}
            />
          )}
          {(exercise.duration_seconds !== null || set.duration_seconds !== null) && (
            <SetValue
              label="Czas"
              actual={set.duration_seconds}
              unit=" s"
              difference={compare ? delta(set.duration_seconds, exercise.duration_seconds) : null}
            />
          )}
          {(exercise.weight_kg !== null || set.weight_kg !== null) && (
            <SetValue
              label="Ciężar"
              actual={set.weight_kg}
              unit=" kg"
              difference={compare ? delta(set.weight_kg, exercise.weight_kg) : null}
            />
          )}
        </dl>
      )}
    </li>
  );
}

function ExerciseComparison({
  exercise,
  result,
  rounds,
}: {
  exercise: TrainingExercise;
  result: TrainingExerciseResult | undefined;
  rounds?: number;
}) {
  const replacement = result?.replacement;
  const actualExercise = replacement ?? exercise;
  const completedSets = result?.sets.filter((set) => !set.skipped).length ?? 0;
  const difference = delta(completedSets, rounds ?? exercise.sets ?? 1);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section
        className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 sm:p-5"
        aria-label={`Plan: ${exercise.name}`}
      >
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Rozpiska trenera</p>
        <h3 className="mt-2 text-lg font-semibold break-words">
          {replacement ? <del className="text-slate-400">{exercise.name}</del> : exercise.name}
        </h3>
        <PlanParameters exercise={exercise} rounds={rounds} />
      </section>
      <section
        className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5"
        aria-label={`Wykonanie: ${actualExercise.name}`}
      >
        <p className="text-xs font-semibold tracking-wide text-lime-300 uppercase">Wykonanie</p>
        {replacement && (
          <div className="mt-3 rounded-lg border border-lime-300/30 bg-lime-300/5 p-4">
            <p className="text-xs font-medium text-lime-300">Zamiennik podopiecznego</p>
            <h3 className="mt-1 text-lg font-semibold break-words">{replacement.name}</h3>
            <PlanParameters exercise={replacement} />
            <p className="mt-3 text-xs text-slate-400">Zamiana dotyczy tego wykonania treningu.</p>
          </div>
        )}
        {!result ? (
          <p className="mt-4 text-sm text-slate-400">Brak zapisanych wyników.</p>
        ) : result.skipped ? (
          <p className="mt-4 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">Ćwiczenie pominięte w całości.</p>
        ) : (
          <>
            <div className="my-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm">
                  Wykonane serie: <strong>{completedSets}</strong>
                </p>
                {!replacement && (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      difference.startsWith("+") || difference.startsWith("-")
                        ? "font-medium text-amber-200"
                        : "text-slate-400",
                    )}
                  >
                    {difference}
                  </p>
                )}
              </div>
              <p className="text-sm">
                Trudność: <strong>{result.rating === null ? "Nie oceniono" : `${result.rating}/10`}</strong>
              </p>
            </div>
            {!result.sets.length ? (
              <p className="text-sm text-slate-400">Nie zapisano jeszcze serii.</p>
            ) : (
              <ol className="space-y-3">
                {result.sets.map((set, index) => (
                  <SetRow key={index} set={set} index={index} exercise={actualExercise} compare={!replacement} />
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function TrainerResults({ workout, comments }: Props) {
  const prescription = workout.snapshot ?? workout.prescription;
  const results = workout.results;
  const publicComments = comments.filter((comment) => comment.visibility === "public");
  // A superset is performed as one group at the first member's position,
  // with member order preserved, just as in WorkoutExecution.
  const orderedExercises = prescription.exercises.flatMap((exercise, index) => {
    const group = prescription.supersets.find((item) => item.id === exercise.group_id);
    if (!group) return [exercise];
    if (prescription.exercises.findIndex((item) => item.group_id === group.id) !== index) return [];
    return prescription.exercises.filter((item) => item.group_id === group.id);
  });
  return (
    <div className="space-y-8">
      <section
        className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
        aria-labelledby="comparison-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="comparison-title" className="text-2xl font-semibold">
              Plan i wykonanie
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {workout.snapshot
                ? "Zachowana rozpiska z momentu rozpoczęcia treningu."
                : "Zaplanowana rozpiska. Podopieczny jeszcze nie rozpoczął treningu."}
            </p>
          </div>
          {workout.corrected_at && (
            <p className="rounded-full bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-200">
              Poprawiony · {new Date(workout.corrected_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-700 pt-5 text-sm">
          <p>
            Trudność treningu:{" "}
            <strong>
              {results?.rating === null || results?.rating === undefined ? "Nie oceniono" : `${results.rating}/10`}
            </strong>
          </p>
          {workout.completed_at && (
            <p className="text-slate-300">
              Zakończony: {new Date(workout.completed_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Różnice liczbowe odnoszą się do tego samego ćwiczenia. Przy zakresie pokazujemy odchylenie od najbliższej
          granicy. Zamiennik zachowuje własne parametry.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-700 p-5 sm:p-6" aria-labelledby="warmup-results-title">
        <h2 id="warmup-results-title" className="text-xl font-semibold">
          Rozgrzewka
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <p className="break-words whitespace-pre-wrap text-slate-300">
            {prescription.warmup || "Trener nie dodał szczegółowych instrukcji rozgrzewki."}
          </p>
          <p className="text-sm">
            Status:{" "}
            <strong>
              {results?.warmup_status === "done"
                ? "Wykonana"
                : results?.warmup_status === "skipped"
                  ? "Pominięta"
                  : "Nierozliczona"}
            </strong>
          </p>
        </div>
      </section>
      <section className="space-y-6" aria-labelledby="exercise-results-title">
        <h2 id="exercise-results-title" className="text-xl font-semibold">
          Część właściwa
        </h2>
        {orderedExercises.map((exercise, index) => {
          const group = prescription.supersets.find((item) => item.id === exercise.group_id);
          const firstInGroup = group && !orderedExercises.slice(0, index).some((item) => item.group_id === group.id);
          return (
            <article key={exercise.id} className="space-y-4">
              {firstInGroup && (
                <div className="rounded-xl border border-lime-300/30 bg-lime-300/5 p-4">
                  <h3 className="font-semibold text-lime-200">
                    {group.name} · {group.rounds} rund
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Jedna runda = jedna seria każdego ćwiczenia. Kolejność:{" "}
                    {prescription.exercises
                      .filter((item) => item.group_id === group.id)
                      .map((item) => item.name)
                      .join(" → ")}
                  </p>
                  {group.rest_between_exercises && (
                    <p className="mt-2 text-sm text-slate-300">
                      Przerwa między ćwiczeniami: {group.rest_between_exercises}
                    </p>
                  )}
                  {group.rest_between_rounds && (
                    <p className="mt-2 text-sm text-slate-300">Przerwa między rundami: {group.rest_between_rounds}</p>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-400">
                {index + 1}.{" "}
                {group
                  ? `${group.name} · ćwiczenie ${prescription.exercises.filter((item) => item.group_id === group.id).findIndex((item) => item.id === exercise.id) + 1}`
                  : "Ćwiczenie samodzielne"}
              </p>
              <ExerciseComparison
                exercise={exercise}
                result={results?.exercises.find((item) => item.exercise_id === exercise.id)}
                rounds={group?.rounds}
              />
            </article>
          );
        })}
      </section>
      <section
        className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
        aria-labelledby="trainer-comments-title"
      >
        <h2 id="trainer-comments-title" className="text-xl font-semibold">
          Komentarz podopiecznego
        </h2>
        {publicComments.length ? (
          <ul className="mt-4 space-y-4">
            {publicComments.map((comment) => (
              <li key={comment.id}>
                <p className="break-words whitespace-pre-wrap text-slate-200">{comment.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Udostępniony trenerowi ·{" "}
                  {new Date(comment.updated_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Brak udostępnionego komentarza.</p>
        )}
      </section>
    </div>
  );
}
