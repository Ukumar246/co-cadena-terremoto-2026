import type { HelpCategory, Urgency } from "./types";

export interface CategoryMeta {
  id: HelpCategory;
  label: string;
  /** Se usa como pin del mapa y en los chips de filtro. */
  emoji: string;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "rescate", label: "Rescate", emoji: "🆘", color: "#dc2626" },
  { id: "salud", label: "Salud", emoji: "🏥", color: "#e11d48" },
  { id: "agua", label: "Agua", emoji: "💧", color: "#0284c7" },
  { id: "comida", label: "Comida", emoji: "🍲", color: "#ea580c" },
  { id: "refugio", label: "Refugio", emoji: "🏠", color: "#7c3aed" },
  { id: "ropa", label: "Ropa y abrigo", emoji: "🧥", color: "#0891b2" },
  { id: "transporte", label: "Transporte", emoji: "🚗", color: "#65a30d" },
  { id: "comunicacion", label: "Comunicación", emoji: "📶", color: "#4f46e5" },
  { id: "otro", label: "Otro", emoji: "❓", color: "#64748b" },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryMeta {
  return CATEGORY_BY_ID.get(id as HelpCategory) ?? CATEGORIES[CATEGORIES.length - 1];
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
