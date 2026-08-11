import { User, type UserRow } from "./models";
import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Acceso al perfil de la persona con sesión iniciada.
 *
 * `public.users` sólo es legible y editable por su dueño (política de RLS
 * `auth.uid() = id`), así que estas funciones no necesitan recibir un id:
 * siempre operan sobre quien está autenticado.
 *
 * El flujo de registro y de inicio de sesión todavía no existe — hoy la app
 * es anónima de punta a punta. Esto es la pieza de datos que ese flujo va a
 * usar cuando se construya.
 */

/** El perfil actual, o null si no hay sesión. */
export async function fetchCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, created_at, name, avatar_url, whatsapp, verified_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? User.fromRow(data as UserRow) : null;
}

/** Guarda nombre, avatar y teléfono. `verified_at` sólo lo mueve el equipo. */
export async function saveCurrentUser(user: User): Promise<User> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("La app está en modo demo: falta configurar Supabase.");

  const { data, error } = await supabase
    .from("users")
    .update(user.toRow())
    .eq("id", user.id)
    .select("id, created_at, name, avatar_url, whatsapp, verified_at")
    .single();

  if (error) throw new Error(error.message);
  return User.fromRow(data as UserRow);
}
