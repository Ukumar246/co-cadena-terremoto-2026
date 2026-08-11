"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MapView } from "@/components/MapView";
import { NearbySheet } from "@/components/NearbySheet";
import { requestLocation } from "@/lib/geo";
import { fetchNearbyPosts } from "@/lib/posts";
import type { Coords, HelpPost } from "@/lib/types";

export default function HomePage() {
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pedir la ubicación en cuanto abre. Si la niegan seguimos: se muestran las
  // solicitudes más recientes del país en vez de una pantalla vacía.
  useEffect(() => {
    let cancelled = false;
    requestLocation().then(({ coords, error: geoError }) => {
      if (cancelled) return;
      setUserLocation(coords);
      setLocationError(geoError);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Primera carga sin esperar al GPS, y recarga cuando llega la ubicación.
  // Durante la recarga se mantiene la lista anterior en pantalla: mejor eso
  // que un salto a "cargando" cuando ya había algo que leer.
  useEffect(() => {
    let cancelled = false;

    fetchNearbyPosts(userLocation)
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts);
        setIsDemo(result.isDemo);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("No pudimos cargar las solicitudes. Revisa tu conexión.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  const selected = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId],
  );

  const urgentCount = useMemo(
    () => posts.filter((post) => post.urgency === "alta").length,
    [posts],
  );

  return (
    <main className="h-screen-safe relative w-full overflow-hidden">
      <MapView
        posts={posts}
        userLocation={userLocation}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Barra superior: identidad + estado, sin tapar el mapa. */}
      <header className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="text-lg" aria-hidden="true">
            🤝
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm leading-tight font-semibold">Ayuda Ya</h1>
            <p className="truncate text-[11px] text-[var(--color-ink-2)]">
              {urgentCount > 0
                ? `${urgentCount} ${urgentCount === 1 ? "caso urgente" : "casos urgentes"} cerca`
                : "Quién necesita ayuda cerca de ti"}
            </p>
          </div>
        </div>

        {isDemo && (
          <p className="pointer-events-auto rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm">
            Datos de ejemplo — falta conectar Supabase (ver README).
          </p>
        )}

        {locationError && (
          <p className="pointer-events-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/95 px-3 py-1.5 text-[11px] text-[var(--color-ink-2)] shadow-sm">
            {locationError}
          </p>
        )}
      </header>

      {/* Acción principal. Se esconde en modo detalle para no competir con
          el botón de WhatsApp. */}
      {!selected && (
        <Link
          href="/pedir"
          className="absolute right-4 bottom-[calc(27dvh+1rem)] z-30 flex h-14 items-center gap-2 rounded-full bg-[var(--color-urgent)] px-5 text-base font-semibold text-white shadow-lg active:brightness-95"
          style={{ bottom: expanded ? "calc(68dvh + 1rem)" : "calc(27dvh + 1rem)" }}
        >
          <span aria-hidden="true">＋</span> Pedir ayuda
        </Link>
      )}

      <NearbySheet
        posts={posts}
        selected={selected}
        loading={loading}
        error={error}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((value) => !value)}
        onSelect={setSelectedId}
      />
    </main>
  );
}
