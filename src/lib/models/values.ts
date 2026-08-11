/**
 * Tipos de valor y objetos-valor compartidos por los modelos.
 *
 * Las tres listas cerradas siguen siendo uniones de string y no clases: son
 * exactamente los valores que acepta el CHECK de la base de datos, tienen que
 * poder compararse con `===` y viajar sin envolver en el JSON de la RPC.
 */

export type PostCategory =
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

/** Iniciales para avatares sin foto. La usan `Post` y `User`. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Para tutear a alguien sin soltarle el nombre completo. */
export function firstNameOf(name: string): string {
  return name.split(/\s+/).filter(Boolean)[0] ?? name;
}

export interface CoordsLike {
  lat: number;
  lng: number;
}

/**
 * Un punto en el mapa. Es una clase y no un objeto suelto porque el orden de
 * lat/lng es la fuente de errores más tonta y más cara de este proyecto:
 * MapLibre y PostGIS quieren [lng, lat], los humanos escriben lat, lng.
 * Aquí sólo hay una forma de sacarlo y se llama `toLngLat()`.
 *
 * Inmutable: cualquier operación devuelve una instancia nueva.
 */
export class Coords {
  readonly lat: number;
  readonly lng: number;

  constructor(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
  }

  /** Devuelve null en vez de lanzar: los datos vienen de GPS y de formularios. */
  static parse(lat: unknown, lng: unknown): Coords | null {
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return new Coords(lat, lng);
  }

  static from(value: CoordsLike): Coords {
    return new Coords(value.lat, value.lng);
  }

  /** El único sitio donde se invierte el orden. */
  toLngLat(): [number, number] {
    return [this.lng, this.lat];
  }

  /** Distancia en metros (Haversine). */
  distanceTo(other: Coords): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(other.lat - this.lat);
    const dLng = toRad(other.lng - this.lng);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(toRad(this.lat)) * Math.cos(toRad(other.lat));
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Desplaza el punto en grados. Se usa para reubicar los datos de ejemplo. */
  offsetBy(dLat: number, dLng: number): Coords {
    return new Coords(this.lat + dLat, this.lng + dLng);
  }

  equals(other: Coords | null): boolean {
    return other !== null && this.lat === other.lat && this.lng === other.lng;
  }

  toJSON(): CoordsLike {
    return { lat: this.lat, lng: this.lng };
  }
}
