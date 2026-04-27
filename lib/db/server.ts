import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

// Server components / route handlers — RLS enforced, auth session from cookie
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored when called from Server Components; proxy handles session refresh
        }
      },
    },
  });
}

// Server-only admin — bypasses RLS; never import this in client components
export function createAdminSupabaseClient() {
  return createClient(URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
