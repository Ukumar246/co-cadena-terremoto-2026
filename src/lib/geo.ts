import type { Coords } from "./types";

/** Distancia en metros entre dos puntos (Haversine). Para ordenar en cliente. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

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

export function isValidCoords(c: Partial<Coords>): c is Coords {
  return (
    typeof c.lat === "number" &&
    typeof c.lng === "number" &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

export interface GeolocationOutcome {
  coords: Coords | null;
  /** Mensaje ya traducido, listo para mostrar. */
  error: string | null;
}

/** Envuelve la API del navegador en algo que se pueda `await` sin try/catch. */
export function requestLocation(timeoutMs = 10_000): Promise<GeolocationOutcome> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      coords: null,
      error: "Este dispositivo no permite compartir la ubicación.",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Necesitamos tu ubicación para mostrarte quién está cerca. Actívala en los ajustes del navegador.",
          2: "No pudimos determinar tu ubicación. Revisa el GPS o la señal.",
          3: "La ubicación tardó demasiado. Inténtalo de nuevo.",
        };
        resolve({
          coords: null,
          error: messages[err.code] ?? "No pudimos obtener tu ubicación.",
        });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
