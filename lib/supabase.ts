import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * One Supabase client for the whole app, used only in the browser. It talks
 * straight to Supabase (no server routes), so signing in by email works
 * with the "implicit" flow: no email templates to edit, no extra route to
 * write. Sessions live in this browser's localStorage, under the key
 * "notefy-auth".
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once both Supabase environment variables are set. Accounts and sync only turn on then. */
export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, { auth: { storageKey: "notefy-auth" } })
  : null;
