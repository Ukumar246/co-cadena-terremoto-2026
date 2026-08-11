"use client";

import { useEffect, useRef, useState } from "react";
// maplibre-gl v6 sólo tiene exportaciones nombradas: `Map` se renombra para no
// pisar el `Map` nativo que usamos para indexar marcadores.
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, LOCATED_ZOOM, MAP_STYLE_URL } from "@/lib/config";
import type { Coords, Post } from "@/lib/models";

interface MapViewProps {
  posts: Post[];
  userLocation: Coords | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * El marcador es un elemento del DOM, no un componente de React: MapLibre
 * los posiciona él mismo y meter React en medio sólo añade re-renders.
 */
function buildMarkerElement(post: Post): HTMLElement {
  const category = post.categoryMeta;

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
    background:#fff; border:3px solid ${post.isUrgent ? "#dc2626" : category.color};
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
      ring.textContent = post.initials;
    };
    ring.appendChild(img);
  } else {
    ring.textContent = post.initials;
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

  if (post.isUrgent) {
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
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

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

    // Un mapa en blanco sin explicación es lo peor que puede pasar aquí: la
    // persona cree que no hay nadie pidiendo ayuda cerca. Los fallos de
    // teselas sueltas son normales con mala señal y no cuentan; sólo es fatal
    // si el estilo nunca llegó a cargar.
    map.on("load", () => setStatus("ready"));
    map.on("error", (event) => {
      console.error("[MapView]", event.error);
      if (!map.isStyleLoaded()) setStatus("failed");
    });

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
        existing.setLngLat(post.coords.toLngLat());
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
          .setLngLat(post.coords.toLngLat())
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

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation.toLngLat());
    } else {
      userMarkerRef.current = new Marker({ element: buildUserElement() })
        .setLngLat(userLocation.toLngLat())
        .addTo(map);
    }

    // Sólo la primera vez: después mandaría el mapa de vuelta cada vez que el
    // GPS se mueve un metro, mientras la persona intenta explorar.
    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      map.flyTo({ center: userLocation.toLngLat(), zoom: LOCATED_ZOOM, duration: 1400 });
    }
  }, [userLocation]);

  // Centrar la tarjeta seleccionada dejando sitio para la hoja inferior.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const post = posts.find((p) => p.id === selectedId);
    if (!post) return;

    map.easeTo({
      center: post.coords.toLngLat(),
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
      el.style.zIndex = active ? "10" : "1";
      el.style.opacity = selectedId && !active ? "0.65" : "1";
    });
  }, [selectedId]);

  return (
    <>
      {/*
        Alto y ancho al 100%, NO `absolute inset-0`: MapLibre le pone la clase
        `.maplibregl-map` a este div, y su hoja de estilos declara
        `position: relative` sin capa. Las utilidades de Tailwind v4 viven
        dentro de `@layer utilities`, y en la cascada lo que no tiene capa
        siempre gana a lo que sí — así que `absolute` se perdía y el div se
        quedaba con 0 de alto. Con `h-full` no hay conflicto: MapLibre no toca
        el tamaño, sólo la posición.
      */}
      <div ref={containerRef} className="h-full w-full" />

      {status === "failed" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6 text-center">
          <p className="text-sm text-[var(--color-ink-2)]">
            No pudimos cargar el mapa. Las solicitudes cercanas siguen abajo en la
            lista.
          </p>
        </div>
      )}
      <style>{`@keyframes ay-pulse {
        0% { transform: scale(.85); opacity: .6; }
        70% { transform: scale(1.35); opacity: 0; }
        100% { transform: scale(1.35); opacity: 0; }
      }`}</style>
    </>
  );
}
