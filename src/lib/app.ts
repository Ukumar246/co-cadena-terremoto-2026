/**
 * La identidad de la app, en un único sitio.
 *
 * Estaba repartida por ocho ficheros —metadatos, manifiesto, cabecera, el
 * saludo de WhatsApp, comentarios— y al cambiar de nombre se quedaban unos
 * cuantos atrás. Aquí sólo hay una copia de cada cosa.
 */

/** El nombre. Se usa tal cual en todas partes menos en el icono. */
export const APP_NAME = "Cadena Terremoto Colombia";

/**
 * Sólo para el icono de la pantalla de inicio: `short_name` del manifiesto y
 * el título de iOS, que Android recorta sobre los 12 caracteres. En el resto
 * de sitios cabe el nombre entero y no hay razón para acortarlo.
 */
export const APP_SHORT_NAME = "Cadena";

export const APP_DESCRIPTION =
  "Mapa de solicitudes de ayuda tras el terremoto en Colombia. Mira quién necesita ayuda cerca de ti y contáctalo por WhatsApp.";

/**
 * Repositorio público. Sin el `.git` del final: esa es la URL para clonar, y
 * pegada en un navegador descarga un fichero en vez de abrir la página.
 */
export const APP_REPO_URL =
  "https://github.com/Ukumar246/co-cadena-terremoto-2026";

/**
 * Cuándo se publicó esta versión.
 *
 * Lo inyecta `next.config.ts` en cada build en vez de escribirlo a mano: una
 * fecha puesta a mano se queda vieja en el primer despliegue en que alguien se
 * olvide de tocarla, y una fecha de publicación equivocada es peor que ninguna
 * — en una emergencia la gente la lee para decidir si la app sigue viva.
 *
 * `null` sólo si falta la variable; la página lo muestra como "—".
 */
export const APP_PUBLISHED_AT: string | null =
  process.env.NEXT_PUBLIC_BUILD_DATE ?? null;

/** El sismo que originó la app. Datos del reporte oficial. */
export const EARTHQUAKE = {
  magnitude: "7,4",
  /** ISO con el huso de Colombia (UTC-5), para que la hora no baile. */
  occurredAt: "2026-08-10T07:34:00-05:00",
  epicentre: "A 9 km de El Cairo, Valle del Cauca",
  countries: ["Colombia", "Ecuador", "Panamá"],
} as const;
