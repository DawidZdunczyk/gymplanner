import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { TrainingComment, TrainingPlan, TrainingWorkout } from "@/lib/training-contract";

type TrainingClient = SupabaseClient<Database>;

export class TrainingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TrainingError";
  }
}

export const trainingActions = new Set([
  "create_plan",
  "create_workout",
  "update_workout",
  "delete_workout",
  "start_workout",
  "save_results",
  "complete_workout",
  "correct_workout",
  "save_comment",
]);

export async function getTrainingOverview(client: TrainingClient): Promise<{
  plans: TrainingPlan[];
  workouts: TrainingWorkout[];
}> {
  const [plans, workouts] = await Promise.all([
    client.from("training_plans").select("*").order("valid_from", { ascending: false }),
    client.from("training_workouts").select("*").order("scheduled_for").order("created_at"),
  ]);
  if (plans.error || workouts.error) throw new TrainingError("Nie udało się pobrać treningów. Spróbuj ponownie.", 503);
  return { plans: plans.data, workouts: workouts.data as unknown as TrainingWorkout[] };
}

export async function getWorkout(
  client: TrainingClient,
  id: string,
): Promise<{ workout: TrainingWorkout; comments: TrainingComment[] } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const workout = await client.from("training_workouts").select("*").eq("id", id).maybeSingle();
  if (workout.error) throw new TrainingError("Nie udało się pobrać treningu. Spróbuj ponownie.", 503);
  if (!workout.data) return null;
  // RLS checks current assignment again and hides private comments from trainers.
  const comments = await client.from("training_comments").select("*").eq("workout_id", id).order("updated_at");
  if (comments.error) throw new TrainingError("Nie udało się pobrać komentarzy. Spróbuj ponownie.", 503);
  return {
    workout: workout.data as unknown as TrainingWorkout,
    comments: comments.data as TrainingComment[],
  };
}

export async function mutateTraining(client: TrainingClient, action: string, payload: Json): Promise<Json> {
  if (!trainingActions.has(action)) throw new TrainingError("Nieznana operacja.", 400);
  const result = await client.rpc("training_mutate", { p_action: action, p_payload: payload });
  if (result.error) {
    const status = { PT400: 400, PT401: 401, PT404: 404, PT409: 409 }[result.error.code];
    if (status) throw new TrainingError(result.error.message, status);
    throw new TrainingError("Nie udało się zapisać zmian. Dane nie zostały zapisane. Spróbuj ponownie.", 503);
  }
  return result.data;
}
