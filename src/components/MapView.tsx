"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// maplibre-gl v6 sólo tiene exportaciones nombradas: `Map` se renombra para no
// pisar el `Map` nativo que usamos para indexar marcadores.
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LOCATED_ZOOM,
  MAP_STYLE_URL,
} from "@/lib/config";
import type { Coords, Post } from "@/lib/models";

/**
 * MapLibre v6 carga su worker desde un fichero suelto y lo localiza con
 * `new URL(nombre, import.meta.url)`, donde `nombre` sale de un ternario.
 * Turbopack resuelve esas URLs estáticamente y con un ternario no puede: le
 * pasa al worker la URL del módulo principal. El worker arranca cargando la
 * librería entera, nunca contesta al protocolo de teselas y el mapa se queda
 * sin capa vectorial — sin errores en consola, porque el fallo es interno al
 * worker. Sólo sobrevive el relieve, que es una fuente ráster y no pasa por
 * ahí.
 *
 * `scripts/copy-maplibre-worker.mjs` deja el worker en `public/maplibre/` y
 * aquí se le da esa URL fija, que ningún bundler tiene que adivinar.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

interface MapViewProps {
  posts: Post[];
  userLocation: Coords | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface MarkerContentProps {
  post: Post;
  onSelect: (id: string) => void;
}

/**
 * Contenido del pin. Es un componente de React de verdad — se inyecta con un
 * portal en el `div` que MapLibre posiciona — y no DOM construido a mano como
 * antes. Ese cambio es lo que permite usar iconos de Lucide y los mismos
 * componentes (`Avatar`) que las tarjetas de la lista.
 */
function MarkerContent({ post, onSelect }: MarkerContentProps) {
  const category = post.categoryMeta;
  const CategoryIcon = category.icon;
  const ringColor = post.isUrgent ? "var(--destructive)" : category.color;

  return (
    <button
      type="button"
      className="ay-marker relative block size-11 cursor-pointer border-0 bg-transparent p-0"
      aria-label={`${post.name} necesita ayuda con ${category.label.toLowerCase()}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(post.id);
      }}
    >
      {post.isUrgent && (
        <span
          aria-hidden="true"
          className="absolute -inset-1 animate-ping rounded-full border-2 opacity-60"
          style={{ borderColor: ringColor }}
        />
      )}

      <Avatar
        className="size-11 bg-card shadow-lg after:border-0"
        style={{
          boxShadow: `0 0 0 3px ${ringColor}, 0 4px 12px rgb(0 0 0 / .28)`,
        }}
      >
        {post.avatarUrl && (
          <AvatarImage asChild src={post.avatarUrl}>
            <Image src={post.avatarUrl} alt="" width={44} height={44} />
          </AvatarImage>
        )}
        <AvatarFallback className="bg-card text-sm font-semibold text-card-foreground">
          {post.initials}
        </AvatarFallback>
      </Avatar>

      <span
        aria-hidden="true"
        className="absolute -right-1 -bottom-1 flex size-5.5 items-center justify-center rounded-full border-2 bg-card"
        style={{ borderColor: category.color }}
      >
        {/* Trazo algo más grueso: a 12 px el grosor por defecto de Lucide se
            deshace, y esta insignia es lo que distingue una categoría de otra
            de un vistazo sobre el mapa. */}
        <CategoryIcon
          className="size-3"
          strokeWidth={2.5}
          style={{ color: category.color }}
        />
      </span>
    </button>
  );
}

/**
 * El punto azul de "estás aquí". No lleva icono de Lucide a propósito: un
 * disco liso es la convención de todos los mapas y cualquier glifo dentro se
 * confundiría con una solicitud de ayuda.
 */
function UserDot() {
  return (
    <span
      aria-hidden="true"
      className="block size-4.5 rounded-full border-[3px] border-background bg-blue-600 ring-3 ring-blue-600/25"
    />
  );
}

export function MapView({
  posts,
  userLocation,
  selectedId,
  onSelect,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  /**
   * Un `div` vacío por solicitud: MapLibre lo coloca, React lo rellena por
   * portal. Va en `useState` con inicializador perezoso y no en un `useRef`
   * porque hay que leerlo durante el render — el portal debe montarse en el
   * mismo paso — y acceder a `.current` ahí está prohibido.
   */
  const [hosts] = useState(() => new Map<string, HTMLDivElement>());
  const [userHost] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );
  const hasFlownRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  // El handler se guarda en un ref para que cambiar de callback no obligue a
  // reconstruir todos los marcadores.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  /**
   * El contenedor se crea durante el render, no en un efecto: el portal lo
   * necesita ya montado en el mismo paso — si se creara después, React no
   * volvería a renderizar y el portal no llegaría a montarse nunca.
   *
   * Es idempotente por id, así que el doble render de StrictMode no duplica
   * nada, y devuelve null en el servidor, donde no hay `document`.
   */
  function hostFor(id: string): HTMLDivElement | null {
    if (typeof document === "undefined") return null;
    let host = hosts.get(id);
    if (!host) {
      host = document.createElement("div");
      hosts.set(id, host);
    }
    return host;
  }

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
      hosts.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // `hosts` viene de useState con inicializador perezoso: es la misma
    // instancia durante toda la vida del componente, así que declararlo aquí
    // no cambia cuándo se ejecuta el efecto — sólo calla al linter.
  }, [hosts]);

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

      const host = hosts.get(post.id);
      if (!host) continue;

      markers.set(
        post.id,
        new Marker({ element: host, anchor: "bottom" })
          .setLngLat(post.coords.toLngLat())
          .addTo(map),
      );
    }

    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.remove();
        markers.delete(id);
        hosts.delete(id);
      }
    }
  }, [posts, hosts]);

  // Punto azul del usuario + primer vuelo a su posición.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation.toLngLat());
    } else {
      if (!userHost) return;
      userMarkerRef.current = new Marker({ element: userHost })
        .setLngLat(userLocation.toLngLat())
        .addTo(map);
    }

    // Sólo la primera vez: después mandaría el mapa de vuelta cada vez que el
    // GPS se mueve un metro, mientras la persona intenta explorar.
    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      map.flyTo({
        center: userLocation.toLngLat(),
        zoom: LOCATED_ZOOM,
        duration: 1400,
      });
    }
  }, [userLocation, userHost]);

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

  // Resaltar el marcador activo. Se toca el contenedor, que es de MapLibre y
  // no del portal, así que sigue siendo manipulación directa del DOM.
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

      {posts.map((post) => {
        const host = hostFor(post.id);
        return host
          ? createPortal(
              <MarkerContent
                post={post}
                onSelect={(id) => onSelectRef.current(id)}
              />,
              host,
              post.id,
            )
          : null;
      })}

      {userHost && createPortal(<UserDot />, userHost, "user-dot")}

      {status === "failed" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            No pudimos cargar el mapa. Las solicitudes cercanas siguen abajo en
            la lista.
          </p>
        </div>
      )}
    </>
  );
}
