import { Coords } from "./models/values";

/**
 * Formateo en español y acceso a la geolocalización del navegador.
 * El cálculo de distancias vive en `Coords`, no aquí.
 */

/** "350 m", "1,2 km" — formato corto para tarjetas en móvil. */
export function formatDistance(meters: number | null): string {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** "hace 5 min", "hace 3 h", "hace 2 d" */
export function formatAge(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/**
 * Una lectura de la ubicación: dónde, y con cuánta incertidumbre.
 *
 * `accuracyM` no es decoración. El navegador casi nunca acierta a la primera:
 * la primera lectura suele venir de la IP o de la antena de telefonía y puede
 * estar a kilómetros. Guardarla es lo que permite decidir cuánto acercar el
 * mapa y avisar de que la posición es aproximada, en vez de plantar el punto
 * azul en una esquina concreta y aparentar una precisión que no existe.
 */
export interface LocationFix {
  coords: Coords;
  /** Radio de incertidumbre en metros, al 95% de confianza. */
  accuracyM: number;
}

export type LocationStatus =
  | "locating"
  | "located"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface LocationState {
  /** La mejor lectura hasta ahora. Puede haber lectura y error a la vez. */
  fix: LocationFix | null;
  status: LocationStatus;
  /** Mensaje ya traducido, listo para mostrar. */
  error: string | null;
}

/** Por debajo de esto ya es precisión de calle: dejamos de refinar. */
export const GOOD_ACCURACY_M = 50;

/**
 * Por encima de esto la lectura no sirve para "quién está cerca de mí": el
 * radio de búsqueda son 25 km y un error de 2 km ya mueve el resultado.
 */
export const COARSE_ACCURACY_M = 2_000;

/** Metros que mide un píxel a esta latitud y este zoom (teselas de 256 px). */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** "±35 m", "±1,4 km" */
export function formatAccuracy(meters: number): string {
  return `±${formatDistance(meters)}`;
}

const ERRORS: Record<number, { status: LocationStatus; error: string }> = {
  1: {
    status: "denied",
    error:
      "No nos diste permiso para usar tu ubicación. Actívalo en el candado de la barra de direcciones y vuelve a intentarlo.",
  },
  2: {
    status: "unavailable",
    error: "No pudimos determinar tu ubicación. Revisa el GPS o la señal.",
  },
  3: {
    status: "timeout",
    error: "La ubicación tardó demasiado. Inténtalo de nuevo.",
  },
};

export interface WatchOptions {
  /** Precisión a partir de la cual dejamos de escuchar. */
  goodAccuracyM?: number;
  /** Tope de tiempo escuchando, aunque no se alcance esa precisión. */
  maxWaitMs?: number;
}

/**
 * Sigue la ubicación hasta tener una lectura buena, y entonces para.
 *
 * `watchPosition` y no `getCurrentPosition` porque una sola lectura es la que
 * deja el mapa clavado en el primer resultado, que es justo el peor: el
 * navegador entrega enseguida una posición gruesa y va afinando durante los
 * segundos siguientes. Aquí nos quedamos con la mejor de todas.
 *
 * `maximumAge: 0` porque una posición cacheada de hace un minuto puede ser de
 * otro barrio, y en esta app eso manda a alguien a la dirección equivocada.
 *
 * Sólo avisa cuando la lectura mejora, así que quien escuche no se ve inundado
 * de actualizaciones ni recarga la lista por un metro de diferencia.
 *
 * Devuelve la función para dejar de escuchar.
 */
export function watchLocation(
  onUpdate: (state: LocationState) => void,
  { goodAccuracyM = GOOD_ACCURACY_M, maxWaitMs = 20_000 }: WatchOptions = {},
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onUpdate({
      fix: null,
      status: "unsupported",
      error: "Este dispositivo no permite compartir la ubicación.",
    });
    return () => {};
  }

  let best: LocationFix | null = null;
  let watchId: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timer !== null) clearTimeout(timer);
    watchId = null;
    timer = null;
  };

  onUpdate({ fix: null, status: "locating", error: null });

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const coords = Coords.parse(
        position.coords.latitude,
        position.coords.longitude,
      );
      if (!coords) return;

      const accuracyM = Math.max(1, Math.round(position.coords.accuracy));
      if (best && accuracyM >= best.accuracyM) return;

      best = { coords, accuracyM };
      onUpdate({ fix: best, status: "located", error: null });

      if (accuracyM <= goodAccuracyM) stop();
    },
    (err) => {
      const known = ERRORS[err.code] ?? {
        status: "unavailable" as const,
        error: "No pudimos obtener tu ubicación.",
      };
      // Si ya teníamos una lectura, un fallo posterior no la invalida: se
      // conserva y no se molesta a nadie con un error por algo que ya funcionó.
      if (best) return;
      onUpdate({ fix: null, ...known });
      if (err.code === 1) stop();
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
  );

  // Aunque nunca lleguemos a la precisión buena, no tiene sentido dejar el GPS
  // encendido indefinidamente: gasta batería y ya tenemos lo que hay.
  timer = setTimeout(stop, maxWaitMs);

  return stop;
}
