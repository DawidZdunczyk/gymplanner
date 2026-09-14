import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { requireData } from "./access-fixtures.mjs";

export function browserSession(origin) {
  const jar = new Map();
  async function request(path, form) {
    const response = await fetch(origin + path, {
      method: form ? "POST" : "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
        Origin: origin,
        ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const setCookies = response.headers.getSetCookie();
    for (const raw of setCookies) {
      const [pair, ...attrs] = raw.split(";");
      const [name, ...rest] = pair.split("=");
      if (attrs.some((a) => /max-age=0/i.test(a.trim()))) jar.delete(name.trim());
      else jar.set(name.trim(), rest.join("="));
    }
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    return {
      status: response.status,
      location: response.headers.get("location"),
      body: await response.text(),
      setCookies,
    };
  }
  return { request, jar };
}

function sessionCookie(jar) {
  const names = [...jar.keys()]
    .filter((name) => /-auth-token(?:\.\d+)?$/.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  assert.ok(names.length, "Session cookie exists");
  const encoded = decodeURIComponent(names.map((name) => jar.get(name)).join(""));
  assert.ok(encoded.startsWith("base64-"), "SSR session encoding");
  return { names, value: JSON.parse(Buffer.from(encoded.slice(7), "base64url").toString()) };
}

export async function runHttpChecks({ accounts: a, admin }, origin) {
  const sessions = {};
  const anonymous = browserSession(origin);
  for (const path of ["/dashboard", `/dashboard/trainees/${a.traineeA.id}`]) {
    const response = await anonymous.request(path);
    assert.equal(response.status, 302);
    assert.equal(response.location, "/auth/signin");
  }
  for (const [key, account] of Object.entries(a)) {
    const browser = browserSession(origin);
    const login = await browser.request("/api/auth/signin", { email: account.email, password: account.password });
    assert.equal(login.status, 302, `Login ${key}`);
    assert.equal(login.location, "/dashboard");
    sessions[key] = browser;
    const panel = await browser.request("/dashboard");
    assert.equal(panel.status, 200, `Panel ${key}`);
    assert.ok(panel.body.includes('lang="pl"'));
    if (account.profile) assert.ok(panel.body.includes(account.profile.display_name));
    for (const other of Object.values(a)) assert.ok(!panel.body.includes(other.email), "No login emails in panel");
  }
  const trainerPanel = await sessions.trainerA.request("/dashboard");
  assert.ok(trainerPanel.body.includes(a.traineeA.profile.identification_label));
  assert.ok(trainerPanel.body.includes(`/dashboard/trainees/${a.traineeA.id}`));
  assert.ok(!trainerPanel.body.includes(a.traineeB.profile.identification_label));
  const cardPath = `/dashboard/trainees/${a.traineeA.id}`;
  const card = await sessions.trainerA.request(cardPath);
  assert.equal(card.status, 200);
  assert.ok(card.body.includes(a.traineeA.profile.identification_label));
  assert.ok(card.body.includes('href="/dashboard"'));
  const denied = [];
  for (const id of [a.traineeB.id, randomUUID(), "invalid-id"]) {
    const response = await sessions.trainerA.request(`/dashboard/trainees/${id}`);
    assert.equal(response.status, 404);
    denied.push(response.body);
  }
  assert.equal(new Set(denied).size, 1, "Foreign, missing, malformed IDs have identical pages");
  for (const key of ["traineeA", "unconfigured", "unassigned"])
    assert.equal((await sessions[key].request(cardPath)).status, 404);
  assert.ok((await sessions.traineeA.request("/dashboard")).body.includes(a.trainerA.profile.identification_label));
  assert.ok((await sessions.unassigned.request("/dashboard")).body.includes("Nie masz jeszcze przypisanego trenera"));
  assert.ok((await sessions.unconfigured.request("/dashboard")).body.includes("Konto oczekuje na konfigurację"));

  const cookie = sessionCookie(sessions.trainerA.jar);
  const oldRefresh = cookie.value.refresh_token;
  cookie.value.expires_at = 1;
  const replacement = `base64-${Buffer.from(JSON.stringify(cookie.value)).toString("base64url")}`;
  for (const name of cookie.names) sessions.trainerA.jar.delete(name);
  const baseName = cookie.names[0].replace(/\.\d+$/, "");
  for (let i = 0; i * 3000 < replacement.length; i++)
    sessions.trainerA.jar.set(`${baseName}.${i}`, replacement.slice(i * 3000, (i + 1) * 3000));
  const refreshed = await sessions.trainerA.request("/dashboard");
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.setCookies.length, "Refresh writes cookies");
  const renewed = sessionCookie(sessions.trainerA.jar).value;
  assert.ok(renewed.expires_at > Date.now() / 1000, "New session expiry");
  assert.ok(renewed.refresh_token !== oldRefresh, "Auth actually rotates refresh token");
  assert.equal((await sessions.trainerA.request(cardPath)).status, 200, "Refreshed session survives next request");

  requireData(
    await admin.from("trainer_assignments").update({ trainer_id: a.trainerB.id }).eq("trainee_id", a.traineeA.id),
    "Reassign fixture",
  );
  assert.equal((await sessions.trainerA.request(cardPath)).status, 404);
  assert.ok(
    (await sessions.trainerA.request("/dashboard")).body.includes("Nie masz jeszcze przypisanych podopiecznych"),
  );
  assert.equal((await sessions.trainerB.request(cardPath)).status, 200);
  const sameNames = await sessions.trainerB.request("/dashboard");
  for (const key of ["traineeA", "traineeB"])
    assert.ok(sameNames.body.includes(a[key].profile.identification_label), "Same-name identities remain distinct");
  const changedTrainee = await sessions.traineeA.request("/dashboard");
  assert.ok(changedTrainee.body.includes(a.trainerB.profile.identification_label));
  assert.ok(!changedTrainee.body.includes(a.trainerA.profile.identification_label));
  const logout = await sessions.trainerB.request("/api/auth/signout", {});
  assert.equal(logout.status, 302);
  assert.equal(logout.location, "/");
  assert.equal((await sessions.trainerB.request(cardPath)).location, "/auth/signin");
  console.log(
    "Access HTTP checks passed: role panels, cards, empty states, session refresh, revocation and cache protection.",
  );
}
