"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HandHeart, Plus } from "lucide-react";

import { MapView } from "@/components/MapView";
import { NearbySheet, SNAP_PEEK } from "@/components/NearbySheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestLocation } from "@/lib/geo";
import { fetchNearbyPosts } from "@/lib/posts";
import type { Coords, Post } from "@/lib/models";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number>(SNAP_PEEK);
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
    () => posts.filter((post) => post.isUrgent).length,
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
        <Card
          size="sm"
          className="pointer-events-auto flex-row items-center gap-2 bg-card/95 px-3 backdrop-blur"
        >
          <HandHeart className="size-5 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm leading-tight font-semibold">Ayuda Ya</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {urgentCount > 0
                ? `${urgentCount} ${urgentCount === 1 ? "caso urgente" : "casos urgentes"} cerca`
                : "Quién necesita ayuda cerca de ti"}
            </p>
          </div>
        </Card>

        {isDemo && (
          <Alert className="pointer-events-auto bg-card/95 backdrop-blur">
            <AlertDescription className="text-[11px]">
              Datos de ejemplo — falta conectar Supabase (ver README).
            </AlertDescription>
          </Alert>
        )}

        {locationError && (
          <Alert className="pointer-events-auto bg-card/95 backdrop-blur">
            <AlertDescription className="text-[11px]">
              {locationError}
            </AlertDescription>
          </Alert>
        )}
      </header>

      {/* Acción principal. Se esconde en modo detalle para no competir con
          el botón de WhatsApp, y sube con el cajón para no quedar tapada. */}
      {!selected && (
        <Button
          asChild
          size="lg"
          className="absolute right-4 z-40 h-14 rounded-full bg-destructive px-5 text-base text-white shadow-lg transition-[bottom] duration-300 hover:bg-destructive/90"
          style={{ bottom: `calc(${snap * 100}dvh + 1rem)` }}
        >
          <Link href="/pedir">
            <Plus data-icon="inline-start" className="size-5!" />
            Pedir ayuda
          </Link>
        </Button>
      )}

      <NearbySheet
        posts={posts}
        selected={selected}
        loading={loading}
        error={error}
        snap={snap}
        onSnapChange={setSnap}
        onSelect={setSelectedId}
      />
    </main>
  );
}
