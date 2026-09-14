import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
  const failure = () =>
    context.redirect(
      `/auth/signin?error=${encodeURIComponent("Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.")}`,
    );
  try {
    const form = await context.request.formData();
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password.trim())
      return failure();
    const supabase = context.locals.supabase;
    if (!supabase) return failure();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return failure();
    return context.redirect("/dashboard");
  } catch {
    return failure();
  }
};
