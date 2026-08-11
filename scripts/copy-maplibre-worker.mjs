/**
 * Copia el worker de MapLibre a `public/maplibre/` para poder servirlo con una
 * URL estable.
 *
 *   node scripts/copy-maplibre-worker.mjs
 *
 * Lo ejecutan `predev` y `prebuild`, así que se mantiene solo.
 *
 * ¿Por qué hace falta esto?
 *
 * MapLibre v6 dejó de empotrar el worker en el bundle: ahora es un fichero
 * suelto (`maplibre-gl-worker.mjs`) que la librería localiza en tiempo de
 * ejecución con `new URL(nombre, import.meta.url)`, donde `nombre` sale de un
 * ternario. Turbopack resuelve esas URLs de forma estática y ese ternario no
 * puede: acaba devolviendo la URL del *módulo principal* en lugar de la del
 * worker. El worker arranca cargando la librería entera, nunca contesta al
 * protocolo de teselas, y los mosaicos vectoriales se quedan en blanco para
 * siempre — sin un solo error en consola, porque el fallo ocurre dentro del
 * worker.
 *
 * Apuntar `setWorkerUrl()` al asset que emite Turbopack tampoco sirve: copia
 * los ficheros con nombre hasheado pero NO reescribe los imports que llevan
 * dentro, así que el `./maplibre-gl-shared.mjs` del worker da 404.
 *
 * Por eso se copian los dos juntos y con su nombre original: el import
 * relativo del worker resuelve, y la URL que pasamos a `setWorkerUrl()` no
 * depende de cómo empaquete el bundler.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "maplibre");

// Se resuelve por el algoritmo de Node en vez de con una ruta a mano:
// en un monorepo `maplibre-gl` puede no estar en el node_modules de al lado.
const DIST = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";

// El worker importa `./maplibre-gl-shared.mjs` con ruta relativa: los dos
// tienen que acabar en la misma carpeta y conservar su nombre.
//
// Sólo la variante de producción. El `exports` del paquete apunta siempre a
// `dist/maplibre-gl.mjs` — no hay condición `development` —, así que el hilo
// principal carga el build de producción también en `npm run dev` y el worker
// tiene que ser del mismo build.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

mkdirSync(OUT_DIR, { recursive: true });

for (const file of FILES) {
  copyFileSync(join(DIST, file), join(OUT_DIR, file));
  console.log(`public/maplibre/${file}`);
}
