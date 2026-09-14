import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { test as base, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

interface TrainingUsers {
  trainerPage: Page;
  traineePage: Page;
  otherTrainerPage: Page;
  traineeId: string;
}

interface LocalInfo {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

function localInfo(): LocalInfo {
  const workdir = process.env.SUPABASE_WORKDIR ? ["--workdir", process.env.SUPABASE_WORKDIR] : [];
  const status = spawnSync("npx", ["--no-install", "supabase", ...workdir, "status", "-o", "json"], {
    encoding: "utf8",
  });
  if (status.status !== 0) throw new Error("E2E requires running local Supabase");
  let value: Partial<LocalInfo>;
  try {
    value = JSON.parse(status.stdout) as Partial<LocalInfo>;
  } catch {
    throw new Error("Invalid local Supabase status");
  }
  if (!value.API_URL || !value.ANON_KEY || !value.SERVICE_ROLE_KEY)
    throw new Error("Local Supabase fixture configuration is incomplete");
  const url = new URL(value.API_URL);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new Error("E2E fixtures may only use loopback Supabase");
  return value as LocalInfo;
}

export const test = base.extend<{ trainingUsers: TrainingUsers }>({
  trainingUsers: async ({ browser, playwright, baseURL }, provide) => {
    if (baseURL !== "http://127.0.0.1:4321") throw new Error("E2E requires the local application");
    const info = localInfo();
    const admin = createClient<Database>(info.API_URL, info.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ids: string[] = [];
    const contexts = [];
    const accounts: { id: string; email: string; password: string }[] = [];
    let cleanupFailed = false;
    let failure: unknown;
    try {
      for (const role of ["trainer", "trainee", "trainer"] as const) {
        const tag = randomUUID();
        const email = `e2e-${tag}@example.test`;
        const password = `${randomUUID()}Aa1!`;
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw new Error("Could not create local E2E account");
        ids.push(data.user.id);
        accounts.push({ id: data.user.id, email, password });
        const profile = await admin.from("profiles").insert({
          id: data.user.id,
          role,
          display_name: role === "trainer" ? "Trener testowy" : "Anna Nowak",
          identification_label: `E2E ${tag}`,
        });
        if (profile.error) throw new Error("Could not prepare local E2E profile");
      }
      const assigned = await admin.from("trainer_assignments").insert({
        trainer_id: accounts[0].id,
        trainee_id: accounts[1].id,
      });
      if (assigned.error) throw new Error("Could not assign local E2E trainee");
      for (const account of accounts) {
        const session = await playwright.request.newContext({ baseURL });
        try {
          const login = await session.post("/api/auth/signin", {
            form: { email: account.email, password: account.password },
            headers: { Origin: baseURL },
            maxRedirects: 0,
          });
          if (login.status() !== 302 || login.headers().location !== "/dashboard")
            throw new Error("Local E2E login failed");
          // Real SSR cookies stay in memory; never write storageState or credentials to artifacts.
          contexts.push(await browser.newContext({ baseURL, storageState: await session.storageState() }));
          contexts.at(-1)?.setDefaultTimeout(15000);
        } finally {
          await session.dispose();
        }
      }
      await provide({
        trainerPage: await contexts[0].newPage(),
        traineePage: await contexts[1].newPage(),
        otherTrainerPage: await contexts[2].newPage(),
        traineeId: accounts[1].id,
      });
    } catch (error) {
      failure = error;
    } finally {
      for (const context of contexts) {
        try {
          await context.close();
        } catch {
          cleanupFailed = true;
        }
      }
      for (const id of ids.reverse()) {
        try {
          if ((await admin.auth.admin.deleteUser(id)).error) cleanupFailed = true;
        } catch {
          cleanupFailed = true;
        }
      }
    }
    if (cleanupFailed) throw new Error("E2E fixture cleanup failed");
    if (failure) throw failure instanceof Error ? failure : new Error("E2E fixture failed");
  },
});

export { expect } from "@playwright/test";
