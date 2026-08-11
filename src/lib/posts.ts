import { DEFAULT_RADIUS_M, MAX_POSTS } from "./config";
import { DEMO_POSTS, DEMO_WHATSAPP } from "./demo-data";
import { distanceMeters } from "./geo";
import { getSupabaseBrowserClient } from "./supabase/client";
import type {
  Coords,
  HelpPost,
  HelpPostDetail,
  NewHelpPost,
  HelpCategory,
  Urgency,
} from "./types";

/** Filas tal como las devuelven las funciones RPC (snake_case). */
interface PostRow {
  id: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
  category: string;
  description: string;
  lat: number;
  lng: number;
  address_label: string | null;
  photo_url: string | null;
  urgency: string;
  status: string;
  distance_m: number | null;
}

interface PostDetailRow extends PostRow {
  whatsapp: string;
}

function toPost(row: PostRow): HelpPost {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    avatarUrl: row.avatar_url,
    category: row.category as HelpCategory,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    addressLabel: row.address_label,
    photoUrl: row.photo_url,
    urgency: row.urgency as Urgency,
    status: row.status as HelpPost["status"],
    distanceM: row.distance_m,
  };
}

export interface FetchResult {
  posts: HelpPost[];
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
    return { posts: relocateDemoPosts(center), isDemo: true };
  }

  const { data, error } = await supabase.rpc("posts_nearby", {
    in_lat: center?.lat ?? null,
    in_lng: center?.lng ?? null,
    in_radius_m: radiusM,
    in_limit: MAX_POSTS,
  });

  if (error) throw new Error(error.message);
  return { posts: (data as PostRow[]).map(toPost), isDemo: false };
}

/** Trae una solicitud con su WhatsApp. Se llama sólo al abrir el detalle. */
export async function fetchPostDetail(id: string): Promise<HelpPostDetail | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const demo = DEMO_POSTS.find((p) => p.id === id);
    return demo ? { ...demo, whatsapp: DEMO_WHATSAPP } : null;
  }

  const { data, error } = await supabase.rpc("post_detail", { in_id: id });
  if (error) throw new Error(error.message);

  const rows = data as PostDetailRow[];
  if (!rows?.length) return null;
  return { ...toPost(rows[0]), whatsapp: rows[0].whatsapp };
}

/** Publica una solicitud. Devuelve el id creado. */
export async function createPost(
  input: NewHelpPost,
  ownerToken: string,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "La app está en modo demo: falta configurar Supabase para poder publicar.",
    );
  }

  const { data, error } = await supabase.rpc("create_post", {
    in_name: input.name,
    in_avatar_url: input.avatarUrl,
    in_whatsapp: input.whatsapp,
    in_category: input.category,
    in_description: input.description,
    in_lat: input.lat,
    in_lng: input.lng,
    in_address_label: input.addressLabel,
    in_photo_url: input.photoUrl,
    in_urgency: input.urgency,
    in_owner_token: ownerToken,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/** Marca como resuelta una solicitud propia. */
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

/**
 * Los datos de ejemplo están anclados a Bogotá. Si el navegador nos dio otra
 * ubicación, los trasladamos para que el modo demo se vea razonable en
 * cualquier parte en vez de mandar el mapa a otra ciudad.
 */
function relocateDemoPosts(center: Coords | null): HelpPost[] {
  if (!center) return DEMO_POSTS;

  const anchor = { lat: DEMO_POSTS[0].lat, lng: DEMO_POSTS[0].lng };
  const dLat = center.lat - anchor.lat;
  const dLng = center.lng - anchor.lng;

  return DEMO_POSTS.map((post) => {
    const lat = post.lat + dLat;
    const lng = post.lng + dLng;
    return { ...post, lat, lng, distanceM: distanceMeters(center, { lat, lng }) };
  });
}
