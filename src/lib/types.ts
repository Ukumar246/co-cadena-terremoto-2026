/**
 * Núcleo del dominio: una solicitud de ayuda publicada por una persona.
 *
 * El teléfono de WhatsApp NO viaja en el listado del mapa — sólo se obtiene
 * al abrir una solicitud concreta (ver `fetchPostDetail`). Esto encarece el
 * scrapeo masivo de números sin estorbar a quien de verdad quiere ayudar.
 */

export type HelpCategory =
  | "rescate"
  | "salud"
  | "agua"
  | "comida"
  | "refugio"
  | "ropa"
  | "transporte"
  | "comunicacion"
  | "otro";

export type Urgency = "alta" | "media" | "baja";

export type PostStatus = "active" | "resolved" | "expired";

/** Lo que se pinta en el mapa. Sin datos de contacto. */
export interface HelpPost {
  id: string;
  createdAt: string;
  name: string;
  avatarUrl: string | null;
  category: HelpCategory;
  description: string;
  lat: number;
  lng: number;
  addressLabel: string | null;
  photoUrl: string | null;
  urgency: Urgency;
  status: PostStatus;
  /** Metros desde la ubicación consultada. Null si se pidió sin ubicación. */
  distanceM: number | null;
}

/** Solicitud completa, con contacto. Se pide de a una. */
export interface HelpPostDetail extends HelpPost {
  whatsapp: string;
}

/** Lo que envía el formulario de publicación. */
export interface NewHelpPost {
  name: string;
  avatarUrl: string | null;
  whatsapp: string;
  category: HelpCategory;
  description: string;
  lat: number;
  lng: number;
  addressLabel: string | null;
  photoUrl: string | null;
  urgency: Urgency;
}

export interface Coords {
  lat: number;
  lng: number;
}
