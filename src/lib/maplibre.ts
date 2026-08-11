import { setWorkerUrl } from "maplibre-gl";

/**
 * Configuración global de MapLibre. La usa cualquier pantalla que monte un
 * mapa — hoy `MapView` y `LocationPicker` — y tiene que ejecutarse antes de
 * crear el primer mapa.
 *
 * Vive aquí y no en un componente porque olvidarla no da error: el mapa se
 * dibuja igual, pero sin capa vectorial y sin nada en consola. Fue justo lo
 * que pasó al añadir el selector de ubicación de `/pedir`, que no importaba
 * `MapView` y por tanto no ejecutaba su `setWorkerUrl`.
 *
 * Un solo fichero, sin variante de desarrollo: el `exports` de maplibre-gl
 * apunta siempre a `dist/maplibre-gl.mjs` — no hay condición `development` —,
 * así que el hilo principal usa el build de producción también en `npm run
 * dev` y el worker tiene que ser del mismo build. Apuntar a un
 * `…-worker-dev.mjs` inexistente devuelve el HTML del 404 y el worker muere
 * con `Failed to load module script`.
 *
 * `scripts/copy-maplibre-worker.mjs` deja el fichero en su sitio; lo ejecutan
 * `predev` y `prebuild`.
 */
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

let configured = false;

export function configureMapLibre(): void {
  if (configured) return;
  configured = true;
  setWorkerUrl(WORKER_URL);
}
