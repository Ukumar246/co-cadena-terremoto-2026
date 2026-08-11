import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de servidor con la service role key. Sólo para operaciones que
 * deben saltarse RLS (moderación, limpieza programada). Las lecturas y
 * escrituras normales van por las funciones RPC desde el navegador.
 *
 * Nunca importar esto desde un componente cliente: `server-only` lo impide
 * en tiempo de build.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
