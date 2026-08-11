import { DEFAULT_RADIUS_M, MAX_POSTS } from "./config";
import { DEMO_WHATSAPP, demoPostsNear, findDemoPost } from "./demo-data";
import {
  Coords,
  NewPost,
  Post,
  PostWithContact,
  type PostRow,
  type PostWithContactRow,
} from "./models";
import { getSupabaseBrowserClient } from "./supabase/client";

export interface FetchResult {
  posts: Post[];
  /** True cuando no hay Supabase configurado y se están viendo datos falsos. */
  isDemo: boolean;
}

/**
 * Solicitudes activas cerca de un punto, ya ordenadas por urgencia y cercanía.
 * Sin credenciales devuelve el set de ejemplo reubicado alrededor del usuario,
 * para que la interfaz sea navegable desde el primer `npm run dev`.
 */
export async function fetchNearbyPosts(
  center: Coords | null,
  radiusM: number = DEFAULT_RADIUS_M,
): Promise<FetchResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { posts: demoPostsNear(center), isDemo: true };
  }

  const { data, error } = await supabase.rpc("posts_nearby", {
    in_lat: center?.lat ?? null,
    in_lng: center?.lng ?? null,
    in_radius_m: radiusM,
    in_limit: MAX_POSTS,
  });

  if (error) throw new Error(error.message);
  return { posts: (data as PostRow[]).map(Post.fromRow), isDemo: false };
}

/** Trae una solicitud con su WhatsApp. Se llama sólo al abrir el detalle. */
export async function fetchPostDetail(id: string): Promise<PostWithContact | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const demo = findDemoPost(id);
    return demo
      ? new PostWithContact({ ...demo, whatsapp: DEMO_WHATSAPP })
      : null;
  }

  const { data, error } = await supabase.rpc("post_detail", { in_id: id });
  if (error) throw new Error(error.message);

  const rows = data as PostWithContactRow[];
  if (!rows?.length) return null;
  return PostWithContact.fromRow(rows[0]);
}

/**
 * Publica una solicitud. Devuelve el id creado.
 *
 * Se valida antes de salir a la red: con mala señal, enterarse de que falta
 * el nombre después de 20 segundos de espera es perder el intento.
 */
export async function createPost(draft: NewPost, ownerToken: string): Promise<string> {
  const problems = draft.validate();
  if (problems.length > 0) throw new Error(problems[0]);

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "La app está en modo demo: falta configurar Supabase para poder publicar.",
    );
  }

  const { data, error } = await supabase.rpc("create_post", draft.toRpcArgs(ownerToken));
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Marca como resuelta una solicitud propia. El servidor la acepta si el token
 * del dispositivo coincide o si quien llama es el dueño de la cuenta.
 */
export async function resolvePost(id: string, ownerToken: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("resolve_post", {
    in_id: id,
    in_owner_token: ownerToken,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
