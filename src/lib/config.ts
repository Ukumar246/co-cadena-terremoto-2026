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

/**
 * Zoom al aterrizar sobre la persona.
 *
 * No es un número fijo: se encuadra el círculo de incertidumbre que reporta el
 * navegador, acotado entre estos dos. Con una lectura de ±20 m se llega al
 * máximo; con una de ±5 km el mapa se queda lejos a propósito, porque acercarse
 * a una calle concreta cuando el error es de kilómetros es mentir con el
 * encuadre.
 *
 * El máximo es 16 y no más porque las teselas de OpenFreeMap llegan a z14: por
 * encima no aparece detalle nuevo, sólo se agranda el mismo.
 */
export const LOCATED_MAX_ZOOM = 16;
export const LOCATED_MIN_ZOOM = 9;

/** Encuadre cuando hay posición pero no se sabe con qué precisión. */
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
