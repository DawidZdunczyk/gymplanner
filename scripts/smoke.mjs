import { randomUUID } from "node:crypto";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { pathToFileURL } from "node:url";

const isLoopback = (url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

export function readSmokeConfig(env = process.env) {
  const url = new URL(env.BASE_URL ?? "http://localhost:4321");
  const mode = env.SMOKE_MODE ?? "existing";
  if (!["signup", "existing"].includes(mode)) throw new Error("SMOKE_MODE must be signup or existing");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("BASE_URL must be an origin without credentials, query or path");
  }
  if (!isLoopback(url) && url.protocol !== "https:") throw new Error("Hosted smoke requires HTTPS");
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported BASE_URL protocol");
  if (mode === "signup") {
    if (!isLoopback(url) || !env.SUPABASE_URL || !isLoopback(new URL(env.SUPABASE_URL))) {
      throw new Error("Signup smoke requires both the application and Supabase on loopback");
    }
    return { origin: url.origin, mode, email: `smoke-${randomUUID()}@example.com`, password: randomUUID() };
  }
  if (!env.SMOKE_EMAIL || !env.SMOKE_PASSWORD)
    throw new Error("Existing smoke requires SMOKE_EMAIL and SMOKE_PASSWORD");
  return { origin: url.origin, mode, email: env.SMOKE_EMAIL, password: env.SMOKE_PASSWORD };
}

export async function runSmoke(config) {
  const { origin, mode, email, password } = config;
  const jar = new Map();
  // Native HTTP preserves the browser navigation header; fetch replaces it
  // with its own request mode. This checks Cloudflare's asset routing too.
  function navigate(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, origin);
      const get = url.protocol === "https:" ? httpsGet : httpGet;
      const request = get(url, { headers: { "Sec-Fetch-Mode": "navigate" } }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            location: response.headers.location ?? "",
            body,
          }),
        );
      });
      request.setTimeout(15000, () => request.destroy(new Error("Browser navigation timed out")));
      request.on("error", reject);
    });
  }
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
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const [name, ...rest] = pair.split("=");
      if (attrs.some((a) => /max-age=0/i.test(a.trim()))) jar.delete(name.trim());
      else jar.set(name.trim(), rest.join("="));
    }
    return { status: response.status, location: response.headers.get("location") ?? "", body: await response.text() };
  }
  async function check(name, operation, verify) {
    const response = await operation();
    if (!verify(response)) throw new Error(`${name}: unexpected response (HTTP ${response.status})`);
    console.log(`PASS ${name}`);
  }
  const redirect = (location) => (r) => r.status === 302 && r.location === location;
  const dashboard = (r) => r.status === 200 && r.body.includes("/api/auth/signout");
  await check(
    "browser navigation renders GymPlanner",
    () => navigate("/"),
    (r) => r.status === 200 && /<title>GymPlanner<\/title>/.test(r.body),
  );
  await check("browser navigation protects dashboard", () => navigate("/dashboard"), redirect("/auth/signin"));
  await check(
    "GymPlanner home and configured auth",
    () => request("/"),
    (r) =>
      r.status === 200 &&
      /<title>GymPlanner<\/title>/.test(r.body) &&
      r.body.includes("/auth/signin") &&
      !r.body.includes("Supabase nie jest skonfigurowany") &&
      (mode === "signup" || !r.body.includes("/auth/signup")),
  );
  await check("anonymous dashboard redirects", () => request("/dashboard"), redirect("/auth/signin"));
  await check(
    "signin page",
    () => request("/auth/signin"),
    (r) => r.status === 200 && (mode === "signup" || !r.body.includes("/auth/signup")),
  );
  if (mode === "signup") {
    await check(
      "local signup creates account",
      () => request("/api/auth/signup", { email, password }),
      redirect("/auth/confirm-email"),
    );
  } else {
    await check("signup page disabled", () => request("/auth/signup"), redirect("/auth/signin"));
    // No account data: even a broken signup guard must not create a user.
    await check(
      "signup API disabled",
      () => request("/api/auth/signup", {}),
      (r) => r.status === 403,
    );
  }
  await check(
    "wrong password rejected",
    () => request("/api/auth/signin", { email, password: randomUUID() }),
    (r) => r.status === 302 && r.location.startsWith("/auth/signin?error="),
  );
  await check(
    "correct password accepted",
    () => request("/api/auth/signin", { email, password }),
    redirect("/dashboard"),
  );
  await check("authenticated dashboard", () => request("/dashboard"), dashboard);
  await check("session survives refresh", () => request("/dashboard"), dashboard);
  await check("signout", () => request("/api/auth/signout", {}), redirect("/"));
  await check("dashboard blocked after signout", () => request("/dashboard"), redirect("/auth/signin"));
  console.log("All smoke steps passed");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await runSmoke(readSmokeConfig());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
