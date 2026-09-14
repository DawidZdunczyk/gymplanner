import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function requireData(result, operation) {
  if (result.error) throw new Error(`${operation} failed (${result.error.code ?? result.error.status ?? "unknown"})`);
  return result.data;
}

export async function withAccessFixtures(info, run) {
  const admin = createClient(info.API_URL, info.SERVICE_ROLE_KEY, clientOptions);
  const accounts = {};
  const created = [];
  const tag = randomUUID();
  let failure;
  let cleanupFailures = 0;
  try {
    for (const [key, role] of Object.entries({
      trainerA: "trainer",
      trainerB: "trainer",
      traineeA: "trainee",
      traineeB: "trainee",
      unassigned: "trainee",
      unconfigured: null,
    })) {
      const email = `access-${key.toLowerCase()}-${tag}@example.test`;
      const password = `${randomUUID()}Aa1!`;
      const { user } = requireData(
        await admin.auth.admin.createUser({ email, password, email_confirm: true }),
        "Create fixture account",
      );
      created.push(user.id);
      const profile = role
        ? {
            id: user.id,
            role,
            display_name: role === "trainer" ? `Trener ${key}` : "Anna Nowak",
            identification_label: `${key}-${tag}`,
          }
        : null;
      if (profile) requireData(await admin.from("profiles").insert(profile), "Create fixture profile");
      const client = createClient(info.API_URL, info.ANON_KEY, clientOptions);
      requireData(await client.auth.signInWithPassword({ email, password }), "Sign in fixture");
      accounts[key] = { id: user.id, email, password, profile, client };
    }
    const assignments = ["A", "B"].map((key) => ({
      trainer_id: accounts[`trainer${key}`].id,
      trainee_id: accounts[`trainee${key}`].id,
    }));
    requireData(await admin.from("trainer_assignments").insert(assignments), "Create fixture assignments");
    await run({ accounts, admin, info });
  } catch (error) {
    failure = error;
  } finally {
    for (const id of created.reverse()) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) cleanupFailures++;
    }
  }
  if (cleanupFailures) throw new Error(`Could not clean up ${cleanupFailures} local fixture accounts`);
  if (failure) throw failure;
}
