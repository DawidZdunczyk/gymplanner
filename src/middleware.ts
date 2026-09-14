import { defineMiddleware } from "astro:middleware";
import { ALLOW_SIGNUP } from "astro:env/server";
import { createClient } from "@/lib/supabase";
import { authFailure, isProtectedPath, loadAccess } from "@/lib/access";

export const onRequest = defineMiddleware(async (context, next) => {
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  const supabase = createClient(context.request.headers, context.cookies, responseHeaders);
  context.locals.supabase = supabase;
  context.locals.user = null;
  context.locals.access = { kind: supabase ? "anonymous" : "unavailable" };
  if (supabase) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) context.locals.access = { kind: authFailure(error) };
      else {
        context.locals.user = user;
        if (user && isProtectedPath(context.url.pathname)) context.locals.access = await loadAccess(supabase, user.id);
      }
    } catch {
      context.locals.access = { kind: "unavailable" };
    }
  }
  let response: Response;
  if (!ALLOW_SIGNUP && context.url.pathname.replace(/\/$/, "") === "/auth/signup") {
    response = context.redirect("/auth/signin");
  } else if (isProtectedPath(context.url.pathname) && context.locals.access.kind === "anonymous") {
    response = context.redirect("/auth/signin");
  } else response = await next();
  // Clone immutable redirects too; Astro attaches this request's cookies afterwards.
  const final = new Response(response.body, response);
  responseHeaders.forEach((value, name) => {
    final.headers.set(name, value);
  });
  return final;
});
