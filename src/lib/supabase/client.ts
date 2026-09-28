import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser (Client Components)
 * This client is used for client-side operations like auth state management
 *
 * Note: Database types are temporarily disabled due to version mismatch
 * between @supabase/supabase-js and the generated types.
 * TODO: Regenerate types with `npx supabase gen types typescript` when ready.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local file. " +
      "Get these values from: https://supabase.com/dashboard/project/_/settings/api"
    );
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
