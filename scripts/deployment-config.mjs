import { Buffer } from "node:buffer";

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function origin(value, name) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTPS origin without credentials, port, query or path`);
  }
  return url;
}

export function validatePublicKey(key) {
  if (key.startsWith("sb_publishable_")) return;
  try {
    const parts = key.split(".");
    if (parts.length === 3 && JSON.parse(Buffer.from(parts[1], "base64url").toString()).role === "anon") return;
  } catch {
    /* Invalid keys fail closed below. */
  }
  throw new Error("SUPABASE_KEY must be a publishable or legacy anon key; admin keys are forbidden");
}

export function readDeploymentConfig(target, env = process.env) {
  if (!["staging", "production"].includes(target)) throw new Error("Choose staging or production explicitly");
  const account = required(env, "CLOUDFLARE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID");
  const token = required(env, "CLOUDFLARE_API_TOKEN");
  const stagingDb = origin(required(env, "STAGING_SUPABASE_URL"), "STAGING_SUPABASE_URL");
  const productionDb = origin(required(env, "PRODUCTION_SUPABASE_URL"), "PRODUCTION_SUPABASE_URL");
  for (const db of [stagingDb, productionDb]) {
    if (!/^[a-z0-9-]+\.supabase\.co$/.test(db.hostname)) throw new Error("Use hosted Supabase project URLs");
  }
  if (stagingDb.hostname === productionDb.hostname)
    throw new Error("Staging and production must use different Supabase projects");
  const staging = origin(required(env, "STAGING_URL"), "STAGING_URL");
  const production = origin(required(env, "PRODUCTION_URL"), "PRODUCTION_URL");
  const suffix = staging.hostname.match(/^gymplanner-staging\.([a-z0-9-]+)\.workers\.dev$/)?.[1];
  if (!suffix || production.hostname !== `gymplanner.${suffix}.workers.dev`)
    throw new Error("Worker URLs must match gymplanner-staging and gymplanner on the same workers.dev account");
  const prefix = target.toUpperCase();
  const key = required(env, `${prefix}_SUPABASE_KEY`);
  validatePublicKey(key);
  return {
    target,
    account,
    token,
    subdomain: suffix,
    worker: target === "staging" ? "gymplanner-staging" : "gymplanner",
    site: (target === "staging" ? staging : production).origin,
    supabaseUrl: (target === "staging" ? stagingDb : productionDb).origin,
    supabaseKey: key,
    smokeEmail: required(env, `${prefix}_SMOKE_EMAIL`),
    smokePassword: required(env, `${prefix}_SMOKE_PASSWORD`),
  };
}
