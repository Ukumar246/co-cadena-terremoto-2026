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
