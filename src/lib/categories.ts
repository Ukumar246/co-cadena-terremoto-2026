import {
  Car,
  CircleHelp,
  Droplet,
  HeartPulse,
  House,
  RadioTower,
  Shirt,
  Siren,
  Soup,
  type LucideIcon,
} from "lucide-react";

import type { PostCategory, Urgency } from "./models/values";

/**
 * Metadatos de presentación de las listas cerradas.
 *
 * Siguen siendo interfaces y no clases: describen configuración estática, no
 * entidades del dominio. No tienen identidad ni ciclo de vida ni
 * comportamiento — convertirlas en clases sólo añadiría ceremonia.
 */
export interface CategoryMeta {
  id: PostCategory;
  label: string;
  /**
   * Icono de Lucide. Se usa en los chips y en la insignia del pin del mapa.
   * Antes eran emoji: cada sistema operativo los dibujaba distinto y en
   * tamaños pequeños varios eran indistinguibles.
   */
  icon: LucideIcon;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "rescate", label: "Rescate", icon: Siren, color: "#dc2626" },
  { id: "salud", label: "Salud", icon: HeartPulse, color: "#e11d48" },
  { id: "agua", label: "Agua", icon: Droplet, color: "#0284c7" },
  { id: "comida", label: "Comida", icon: Soup, color: "#ea580c" },
  { id: "refugio", label: "Refugio", icon: House, color: "#7c3aed" },
  { id: "ropa", label: "Ropa y abrigo", icon: Shirt, color: "#0891b2" },
  { id: "transporte", label: "Transporte", icon: Car, color: "#65a30d" },
  { id: "comunicacion", label: "Comunicación", icon: RadioTower, color: "#4f46e5" },
  { id: "otro", label: "Otro", icon: CircleHelp, color: "#64748b" },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryMeta {
  return CATEGORY_BY_ID.get(id as PostCategory) ?? CATEGORIES[CATEGORIES.length - 1];
}

export interface UrgencyMeta {
  id: Urgency;
  label: string;
  color: string;
}

export const URGENCIES: UrgencyMeta[] = [
  { id: "alta", label: "Urgente", color: "#dc2626" },
  { id: "media", label: "Pronto", color: "#f59e0b" },
  { id: "baja", label: "Cuando se pueda", color: "#64748b" },
];

const URGENCY_BY_ID = new Map(URGENCIES.map((u) => [u.id, u]));

export function getUrgency(id: string): UrgencyMeta {
  return URGENCY_BY_ID.get(id as Urgency) ?? URGENCIES[1];
}
