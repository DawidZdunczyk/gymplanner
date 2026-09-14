export interface TrainingTarget {
  kind: "fixed" | "range" | "unlimited";
  min: number | null;
  max: number | null;
}

export interface TrainingExercise {
  id: string;
  name: string;
  sets: TrainingTarget | null;
  reps: TrainingTarget | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  rir: number | null;
  rpe: number | null;
  notes: string;
  group_id: string | null;
}

export interface TrainingSuperset {
  id: string;
  name: string;
  rounds: number;
  rest_between_exercises: string;
  rest_between_rounds: string;
}

export interface TrainingPrescription {
  warmup: string;
  exercises: TrainingExercise[];
  supersets: TrainingSuperset[];
}

export interface TrainingSetResult {
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  skipped: boolean;
}

export interface TrainingExerciseResult {
  exercise_id: string;
  skipped: boolean;
  rating: number | null;
  sets: TrainingSetResult[];
  replacement: TrainingExercise | null;
}

export interface TrainingResults {
  warmup_status: "done" | "skipped" | null;
  exercises: TrainingExerciseResult[];
  rating: number | null;
}

export interface TrainingPlan {
  id: string;
  trainer_id: string;
  trainee_id: string;
  title: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface TrainingWorkout {
  id: string;
  plan_id: string;
  trainer_id: string;
  trainee_id: string;
  week_start: string;
  scheduled_for: string;
  unit_label: string;
  prescription: TrainingPrescription;
  snapshot: TrainingPrescription | null;
  results: TrainingResults | null;
  status: "planned" | "in_progress" | "completed";
  version: number;
  started_at: string | null;
  completed_at: string | null;
  corrected_at: string | null;
  created_at: string;
}

export interface TrainingComment {
  id: string;
  workout_id: string;
  author_id: string;
  body: string;
  visibility: "public" | "private";
  updated_at: string;
}
