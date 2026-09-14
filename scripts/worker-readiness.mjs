import { setTimeout as delay } from "node:timers/promises";

export async function waitForWorker(
  origin,
  { timeoutMs = 120000, intervalMs = 5000, request = fetch, pause = delay, now = Date.now, log = console.log } = {},
) {
  const deadline = now() + timeoutMs;
  let last = "no response";
  while (now() < deadline) {
    let response;
    try {
      response = await request(origin, {
        method: "GET",
        redirect: "manual",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(Math.min(5000, deadline - now())),
      });
    } catch {
      last = "network unavailable or request timed out";
    }
    if (response) {
      await response.body?.cancel();
      if (response.status === 200) return;
      last = `HTTP ${response.status}`;
      // Retry routing/edge availability only. Auth and application errors are
      // checked once by the full smoke test after the URL becomes reachable.
      if (![404, 502, 503, 504, 522, 523, 524].includes(response.status)) {
        throw new Error(`Worker readiness failed: ${last}`);
      }
    }
    log(`Waiting for Worker URL: ${last}`);
    const remaining = deadline - now();
    if (remaining > 0) await pause(Math.min(intervalMs, remaining));
  }
  throw new Error(`Worker URL not ready within ${timeoutMs / 1000}s (${last}); inspect routing and Worker logs`);
}
