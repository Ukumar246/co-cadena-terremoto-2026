/** Configuración del mapa y de la consulta "cerca de mí". */

/**
 * Vista inicial antes de que el navegador nos dé la ubicación: Cali.
 *
 * Que la primera pantalla sea ya la zona afectada es lo que hace la app útil
 * para quien niega el permiso de ubicación o no tiene GPS — antes se abría
 * sobre el país entero y no se veía una sola solicitud.
 */
export const DEFAULT_CENTER: [number, number] = [-76.532, 3.4516];
export const DEFAULT_ZOOM = 12;

/**
 * Tope de alejamiento. La app sólo cubre Cali: dejar salir el mapa hasta ver
 * el continente sólo sirve para perderse y para pedir teselas de sitios donde
 * no hay nada que enseñar. Tres niveles por debajo del inicial dan de sobra
 * para abarcar la ciudad y su área metropolitana.
 */
export const MIN_ZOOM = 9;

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
 * encima no aparece detalle nuevo, sólo se agranda el mismo. El mínimo es el
 * mismo `MIN_ZOOM` del mapa: pedir menos no serviría de nada porque el mapa lo
 * recortaría igualmente.
 */
export const LOCATED_MAX_ZOOM = 16;
export const LOCATED_MIN_ZOOM = MIN_ZOOM;

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
