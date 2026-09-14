import type { APIRoute } from "astro";
import type { Json } from "@/types/database";
import { mutateTraining, TrainingError } from "@/lib/training";

const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
  });

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (!locals.supabase || locals.access.kind === "unavailable")
    return response({ error: "Usługa jest chwilowo niedostępna. Spróbuj ponownie." }, 503);
  if (!locals.user) return response({ error: "Zaloguj się ponownie." }, 401);
  // Cookie-authenticated JSON requests need an explicit same-origin check.
  if (request.headers.get("Origin") !== url.origin)
    return response({ error: "Nieprawidłowe źródło żądania. Odśwież stronę." }, 400);
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return response({ error: "Wymagany jest format JSON." }, 400);
  try {
    // Bound the stream before parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return response({ error: "Brak danych żądania." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 262144) {
        await reader.cancel();
        return response({ error: "Żądanie jest zbyt duże." }, 400);
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return response({ error: "Nieprawidłowy JSON." }, 400);
    }
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      !("action" in input) ||
      typeof input.action !== "string" ||
      !("payload" in input) ||
      !input.payload ||
      typeof input.payload !== "object" ||
      Array.isArray(input.payload) ||
      Object.keys(input).some((key) => key !== "action" && key !== "payload")
    )
      return response({ error: "Nieprawidłowe dane żądania." }, 400);
    const data = await mutateTraining(locals.supabase, input.action, input.payload as Json);
    return response({ data });
  } catch (error) {
    if (error instanceof TrainingError) return response({ error: error.message }, error.status);
    return response({ error: "Nie udało się zapisać zmian. Spróbuj ponownie." }, 503);
  }
};
