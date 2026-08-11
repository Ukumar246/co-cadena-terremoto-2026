/**
 * Respaldo en redes sociales de una solicitud.
 *
 * Sirve para que quien va a moverse pueda comprobar por su cuenta que detrás
 * hay una persona real con un rastro público, no un mensaje suelto en un mapa.
 * Es obligatorio, en una de dos formas:
 *
 *   1. El enlace a la publicación, cuando existe y es permanente.
 *   2. El usuario del perfil, cuando lo que hay es una historia — las de
 *      Instagram y Facebook caducan a las 24 h y su URL no sirve para nadie
 *      que llegue después, así que se guarda a quién buscar y no un enlace
 *      que va a morir.
 */

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "threads"
  | "youtube"
  | "otra";

export interface PlatformMeta {
  id: SocialPlatform;
  label: string;
  /** Dominios que identifican la plataforma en un enlace. */
  hosts: string[];
  /** Cómo se llega a un perfil a partir del usuario. */
  profileUrl?: (handle: string) => string;
}

export const SOCIAL_PLATFORMS: PlatformMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    hosts: ["instagram.com", "instagr.am"],
    profileUrl: (handle) => `https://instagram.com/${handle}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    hosts: ["facebook.com", "fb.com", "fb.watch", "m.facebook.com"],
    profileUrl: (handle) => `https://facebook.com/${handle}`,
  },
  {
    id: "x",
    label: "X (Twitter)",
    hosts: ["x.com", "twitter.com"],
    profileUrl: (handle) => `https://x.com/${handle}`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    hosts: ["tiktok.com", "vm.tiktok.com"],
    profileUrl: (handle) => `https://tiktok.com/@${handle}`,
  },
  {
    id: "threads",
    label: "Threads",
    hosts: ["threads.net", "threads.com"],
    profileUrl: (handle) => `https://threads.net/@${handle}`,
  },
  {
    id: "youtube",
    label: "YouTube",
    hosts: ["youtube.com", "youtu.be"],
    profileUrl: (handle) => `https://youtube.com/@${handle}`,
  },
  { id: "otra", label: "Otra red", hosts: [] },
];

/** Las que se ofrecen para una historia. "Otra" incluida, al final. */
export const STORY_PLATFORMS = SOCIAL_PLATFORMS.filter(
  (platform) => platform.id !== "youtube",
);

const BY_ID = new Map(SOCIAL_PLATFORMS.map((platform) => [platform.id, platform]));

export function getPlatform(id: string | null): PlatformMeta {
  return BY_ID.get(id as SocialPlatform) ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
}

/**
 * Acepta lo que la gente pega de verdad: con `https://` o sin él, con
 * `www.`, con espacios alrededor. Devuelve la URL normalizada o null.
 *
 * No se exige que el dominio esté en la lista: alguien puede compartir por una
 * red que no habíamos previsto, y bloquear a esa persona no protege a nadie.
 */
export function normalizeSocialUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  // Un dominio de verdad tiene un punto y algo después. Esto descarta lo que
  // en realidad era un usuario suelto y se coló en el campo del enlace.
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  return url.toString();
}

/**
 * Deduce la plataforma a partir del dominio del enlace.
 *
 * Normaliza primero: casi nadie escribe el `https://`, y sin él `new URL()`
 * lanza y todo acababa clasificado como "otra".
 */
export function detectPlatform(url: string): SocialPlatform {
  const normalized = normalizeSocialUrl(url);
  if (!normalized) return "otra";

  let hostname: string;
  try {
    hostname = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "otra";
  }

  const found = SOCIAL_PLATFORMS.find((platform) =>
    platform.hosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    ),
  );
  return found?.id ?? "otra";
}

/**
 * Normaliza el usuario: fuera la arroba, los espacios y una URL de perfil
 * pegada entera, que es lo que mucha gente tiene a mano.
 */
export function normalizeHandle(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  // Si pegaron el perfil completo, quedarse con el último segmento.
  if (/^https?:\/\//i.test(value) || value.includes("/")) {
    const parts = value.split("/").filter(Boolean);
    value = parts[parts.length - 1] ?? "";
  }

  value = value.replace(/^@+/, "").trim();
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(value)) return null;
  return value;
}

/** A dónde lleva el respaldo: la publicación, o el perfil de la historia. */
export function socialLink(
  socialUrl: string | null,
  socialHandle: string | null,
  platform: string | null,
): string | null {
  if (socialUrl) return socialUrl;
  if (!socialHandle) return null;
  return getPlatform(platform).profileUrl?.(socialHandle) ?? null;
}
