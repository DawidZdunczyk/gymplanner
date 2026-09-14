declare namespace App {
  interface Locals {
    supabase: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database> | null;
    access: import("@/lib/access").AccessState;
    user: import("@supabase/supabase-js").User | null;
  }
}
