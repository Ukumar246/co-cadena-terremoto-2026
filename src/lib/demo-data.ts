import type { HelpPost } from "./types";

/**
 * Datos de ejemplo para poder ver y desarrollar la interfaz sin Supabase.
 * La app los marca claramente como "ejemplo" en pantalla y NUNCA se usan
 * cuando hay credenciales configuradas.
 */
const MINUTE = 60_000;

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export const DEMO_POSTS: HelpPost[] = [
  {
    id: "demo-1",
    createdAt: ago(12),
    name: "Luisa Mejía",
    avatarUrl: null,
    category: "agua",
    description:
      "Somos 9 personas en el edificio, llevamos dos días sin agua. Tenemos dos bebés.",
    lat: 4.6512,
    lng: -74.0655,
    addressLabel: "Cra. 13 con Calle 63",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 320,
  },
  {
    id: "demo-2",
    createdAt: ago(48),
    name: "Andrés Quintero",
    avatarUrl: null,
    category: "rescate",
    description:
      "Se cayó parte del muro trasero y mi vecino de 70 años no puede salir solo.",
    lat: 4.6448,
    lng: -74.0721,
    addressLabel: "Barrio La Soledad",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 900,
  },
  {
    id: "demo-3",
    createdAt: ago(95),
    name: "Marcela Ruiz",
    avatarUrl: null,
    category: "refugio",
    description:
      "Perdimos el techo. Buscamos dónde pasar la noche con mis dos hijos y un perro.",
    lat: 4.6605,
    lng: -74.0588,
    addressLabel: "Chapinero Alto",
    photoUrl: null,
    urgency: "media",
    status: "active",
    distanceM: 1650,
  },
  {
    id: "demo-4",
    createdAt: ago(180),
    name: "Jorge Patiño",
    avatarUrl: null,
    category: "comida",
    description: "Comedor comunitario. Necesitamos arroz, panela y agua embotellada.",
    lat: 4.6372,
    lng: -74.0812,
    addressLabel: "Salón comunal, Teusaquillo",
    photoUrl: null,
    urgency: "media",
    status: "active",
    distanceM: 2400,
  },
  {
    id: "demo-5",
    createdAt: ago(240),
    name: "Sandra Gómez",
    avatarUrl: null,
    category: "salud",
    description: "Mi mamá es diabética y se quedó sin insulina. No hay droguería abierta.",
    lat: 4.6689,
    lng: -74.0745,
    addressLabel: "Calle 72",
    photoUrl: null,
    urgency: "alta",
    status: "active",
    distanceM: 3100,
  },
];

export const DEMO_WHATSAPP = "+57 300 000 0000";
