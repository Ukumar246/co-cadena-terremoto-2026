"use client";

import { useEffect, useRef } from "react";
// maplibre-gl v6 sólo tiene exportaciones nombradas: `Map` se renombra para no
// pisar el `Map` nativo que usamos para indexar marcadores.
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, LOCATED_ZOOM, MAP_STYLE_URL } from "@/lib/config";
import { getCategory } from "@/lib/categories";
import type { Coords, HelpPost } from "@/lib/types";

interface MapViewProps {
  posts: HelpPost[];
  userLocation: Coords | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Iniciales para cuando alguien publica sin foto de perfil. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * El marcador es un elemento del DOM, no un componente de React: MapLibre
 * los posiciona él mismo y meter React en medio sólo añade re-renders.
 */
function buildMarkerElement(post: HelpPost): HTMLElement {
  const category = getCategory(post.category);
  const isUrgent = post.urgency === "alta";

  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.className = "ay-marker";
  wrapper.setAttribute(
    "aria-label",
    `${post.name} necesita ayuda con ${category.label.toLowerCase()}`,
  );
  wrapper.style.cssText = `
    position: relative; width: 46px; height: 46px; padding: 0; border: 0;
    background: none; cursor: pointer; display: block;
  `;

  const ring = document.createElement("span");
  ring.style.cssText = `
    position:absolute; inset:0; border-radius:9999px;
    background:#fff; border:3px solid ${isUrgent ? "#dc2626" : category.color};
    box-shadow:0 4px 12px rgb(0 0 0 / .28); overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    font: 600 15px/1 var(--font-geist-sans, system-ui); color:#0d1117;
  `;

  if (post.avatarUrl) {
    const img = document.createElement("img");
    img.src = post.avatarUrl;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    // Si la foto no carga, no dejamos un hueco: caen las iniciales.
    img.onerror = () => {
      img.remove();
      ring.textContent = initials(post.name);
    };
    ring.appendChild(img);
  } else {
    ring.textContent = initials(post.name);
  }

  const badge = document.createElement("span");
  badge.textContent = category.emoji;
  badge.setAttribute("aria-hidden", "true");
  badge.style.cssText = `
    position:absolute; right:-4px; bottom:-4px; width:22px; height:22px;
    border-radius:9999px; background:#fff; border:2px solid ${category.color};
    display:flex; align-items:center; justify-content:center; font-size:11px;
  `;

  wrapper.append(ring, badge);

  if (isUrgent) {
    const pulse = document.createElement("span");
    pulse.setAttribute("aria-hidden", "true");
    pulse.style.cssText = `
      position:absolute; inset:-6px; border-radius:9999px;
      border:2px solid #dc2626; opacity:.55; animation: ay-pulse 1.9s ease-out infinite;
    `;
    wrapper.prepend(pulse);
  }

  return wrapper;
}

function buildUserElement(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `
    width:18px; height:18px; border-radius:9999px; background:#2563eb;
    border:3px solid #fff; box-shadow:0 0 0 3px rgb(37 99 235 / .25);
  `;
  return el;
}

export function MapView({ posts, userLocation, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const hasFlownRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  // El handler se guarda en un ref para que cambiar de callback no obligue a
  // reconstruir todos los marcadores.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("click", () => onSelectRef.current(null));

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sincronizar marcadores con las solicitudes (alta/baja incremental).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const post of posts) {
      seen.add(post.id);
      const existing = markers.get(post.id);
      if (existing) {
        existing.setLngLat([post.lng, post.lat]);
        continue;
      }

      const element = buildMarkerElement(post);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(post.id);
      });

      markers.set(
        post.id,
        new Marker({ element, anchor: "bottom" })
          .setLngLat([post.lng, post.lat])
          .addTo(map),
      );
    }

    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [posts]);

  // Punto azul del usuario + primer vuelo a su posición.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    const lngLat: [number, number] = [userLocation.lng, userLocation.lat];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(lngLat);
    } else {
      userMarkerRef.current = new Marker({ element: buildUserElement() })
        .setLngLat(lngLat)
        .addTo(map);
    }

    // Sólo la primera vez: después mandaría el mapa de vuelta cada vez que el
    // GPS se mueve un metro, mientras la persona intenta explorar.
    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      map.flyTo({ center: lngLat, zoom: LOCATED_ZOOM, duration: 1400 });
    }
  }, [userLocation]);

  // Centrar la tarjeta seleccionada dejando sitio para la hoja inferior.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const post = posts.find((p) => p.id === selectedId);
    if (!post) return;

    map.easeTo({
      center: [post.lng, post.lat],
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, -110],
      duration: 500,
    });
  }, [selectedId, posts]);

  // Resaltar visualmente el marcador activo.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const active = id === selectedId;
      el.style.transform = el.style.transform.replace(/ scale\([^)]*\)/, "");
      el.style.zIndex = active ? "10" : "1";
      el.style.filter = active ? "drop-shadow(0 0 0 transparent)" : "";
      el.style.opacity = selectedId && !active ? "0.65" : "1";
    });
  }, [selectedId]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      <style>{`@keyframes ay-pulse {
        0% { transform: scale(.85); opacity: .6; }
        70% { transform: scale(1.35); opacity: 0; }
        100% { transform: scale(1.35); opacity: 0; }
      }`}</style>
    </>
  );
}
