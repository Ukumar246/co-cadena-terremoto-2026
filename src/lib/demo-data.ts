import { Coords, Post } from "./models";

/**
 * Datos de ejemplo para poder ver y desarrollar la interfaz sin Supabase.
 * La app los marca claramente como "ejemplo" en pantalla y NUNCA se usan
 * cuando hay credenciales configuradas.
 */
const MINUTE = 60_000;

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

/** Ninguna publicación de ejemplo tiene cuenta detrás: `userId` es null. */
const DEMO_POSTS: Post[] = [
  new Post({
    id: "demo-1",
    createdAt: ago(12),
    userId: null,
    name: "Luisa Mejía",
    avatarUrl: null,
    category: "agua",
    description:
      "Somos 9 personas en el edificio, llevamos dos días sin agua. Tenemos dos bebés.",
    coords: new Coords(4.6512, -74.0655),
    addressLabel: "Cra. 13 con Calle 63",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 320,
  }),
  new Post({
    id: "demo-2",
    createdAt: ago(48),
    userId: null,
    name: "Andrés Quintero",
    avatarUrl: null,
    category: "rescate",
    description:
      "Se cayó parte del muro trasero y mi vecino de 70 años no puede salir solo.",
    coords: new Coords(4.6448, -74.0721),
    addressLabel: "Barrio La Soledad",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 900,
  }),
  new Post({
    id: "demo-3",
    createdAt: ago(95),
    userId: null,
    name: "Marcela Ruiz",
    avatarUrl: null,
    category: "refugio",
    description:
      "Perdimos el techo. Buscamos dónde pasar la noche con mis dos hijos y un perro.",
    coords: new Coords(4.6605, -74.0588),
    addressLabel: "Chapinero Alto",
    photoUrl: null,
    urgency: "media",
    status: "active",
    distanceM: 1650,
  }),
  new Post({
    id: "demo-4",
    createdAt: ago(180),
    userId: null,
    name: "Jorge Patiño",
    avatarUrl: null,
    category: "comida",
    description: "Comedor comunitario. Necesitamos arroz, panela y agua embotellada.",
    coords: new Coords(4.6372, -74.0812),
    addressLabel: "Salón comunal, Teusaquillo",
    photoUrl: null,
    urgency: "media",
    status: "active",
    distanceM: 2400,
  }),
  new Post({
    id: "demo-5",
    createdAt: ago(240),
    userId: null,
    name: "Sandra Gómez",
    avatarUrl: null,
    category: "salud",
    description: "Mi mamá es diabética y se quedó sin insulina. No hay droguería abierta.",
    coords: new Coords(4.6689, -74.0745),
    addressLabel: "Calle 72",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 3100,
  }),
];

export const DEMO_WHATSAPP = "+57 300 000 0000";

export function findDemoPost(id: string): Post | null {
  return DEMO_POSTS.find((post) => post.id === id) ?? null;
}

/**
 * Los datos de ejemplo están anclados a Bogotá. Si el navegador nos dio otra
 * ubicación, se trasladan para que el modo demo se vea razonable en cualquier
 * parte en vez de mandar el mapa a otra ciudad.
 */
export function demoPostsNear(center: Coords | null): Post[] {
  if (!center) return DEMO_POSTS;

  const anchor = DEMO_POSTS[0].coords;
  const dLat = center.lat - anchor.lat;
  const dLng = center.lng - anchor.lng;

  return DEMO_POSTS.map((post) =>
    post.with({ coords: post.coords.offsetBy(dLat, dLng) }).withDistanceFrom(center),
  );
}
