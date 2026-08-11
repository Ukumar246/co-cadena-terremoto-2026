import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * La app arranca y se puede navegar sin credenciales (modo demo), así que
 * el cliente es opcional en vez de reventar en el import.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  cached ??= createBrowserClient(url, anonKey);
  return cached;
}
