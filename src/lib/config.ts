/** Configuración del mapa y de la consulta "cerca de mí". */

/**
 * Vista inicial antes de que el navegador nos dé la ubicación:
 * Colombia completa. Al conceder permiso, el mapa vuela a la persona.
 *
 * TODO: cuando se confirme el epicentro del sismo, cambiar esto por
 * [lng, lat] del epicentro y subir el zoom a ~10 para que la primera
 * pantalla ya muestre la zona afectada aunque nieguen la ubicación.
 */
export const DEFAULT_CENTER: [number, number] = [-74.1, 4.6];
export const DEFAULT_ZOOM = 5;

/** Zoom al que se aterriza tras geolocalizar. */
export const LOCATED_ZOOM = 13;

/** Radio por defecto de la búsqueda "cerca de mí". */
export const DEFAULT_RADIUS_M = 25_000;
export const MAX_POSTS = 200;

/**
 * OpenFreeMap: teselas vectoriales gratuitas, sin API key ni límite de uso.
 * Si más adelante hace falta un SLA, se cambia por MapTiler/Protomaps aquí.
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

/** Una publicación deja de mostrarse pasado este tiempo si nadie la renueva. */
export const POST_TTL_DAYS = 7;
