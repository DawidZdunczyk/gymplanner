import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types/database";

export type Profile = Tables<"profiles">;
export type AccessState =
  | { kind: "anonymous" | "unconfigured" | "unavailable" }
  | { kind: "trainer"; profile: Profile; trainees: Profile[] }
  | { kind: "trainee"; profile: Profile; trainer: Profile | null };

export function isProtectedPath(path: string): boolean {
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

export function authFailure(error: { name?: string; status?: number; code?: string }): "anonymous" | "unavailable" {
  if (
    error.name === "AuthSessionMissingError" ||
    error.status === 401 ||
    error.status === 403 ||
    [
      "refresh_token_not_found",
      "refresh_token_already_used",
      "session_not_found",
      "session_expired",
      "bad_jwt",
    ].includes(error.code ?? "")
  )
    return "anonymous";
  return "unavailable";
}

export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort(
    (a, b) =>
      a.display_name.localeCompare(b.display_name, "pl") ||
      a.identification_label.localeCompare(b.identification_label, "pl") ||
      a.id.localeCompare(b.id),
  );
}

export async function loadAccess(client: SupabaseClient<Database>, userId: string): Promise<AccessState> {
  try {
    const own = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (own.error) return { kind: "unavailable" };
    if (!own.data) return { kind: "unconfigured" };
    const profile = own.data;
    if (profile.role === "trainer") {
      const assignments = await client.from("trainer_assignments").select("trainee_id").eq("trainer_id", userId);
      if (assignments.error) return { kind: "unavailable" };
      if (!assignments.data.length) return { kind: "trainer", profile, trainees: [] };
      const trainees = await client
        .from("profiles")
        .select("*")
        .eq("role", "trainee")
        .in(
          "id",
          assignments.data.map((row) => row.trainee_id),
        );
      if (trainees.error) return { kind: "unavailable" };
      return { kind: "trainer", profile, trainees: sortProfiles(trainees.data) };
    }
    if (profile.role === "trainee") {
      const assignment = await client
        .from("trainer_assignments")
        .select("trainer_id")
        .eq("trainee_id", userId)
        .maybeSingle();
      if (assignment.error) return { kind: "unavailable" };
      if (!assignment.data) return { kind: "trainee", profile, trainer: null };
      const trainer = await client
        .from("profiles")
        .select("*")
        .eq("role", "trainer")
        .eq("id", assignment.data.trainer_id)
        .maybeSingle();
      if (trainer.error) return { kind: "unavailable" };
      return { kind: "trainee", profile, trainer: trainer.data };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export function assignedTrainee(access: AccessState, id: string | undefined): Profile | null {
  if (access.kind !== "trainer" || !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return null;
  return access.trainees.find((profile) => profile.id === id.toLowerCase()) ?? null;
}
