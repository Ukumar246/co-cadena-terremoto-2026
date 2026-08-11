"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, Plus, Settings } from "lucide-react";

import { MapView } from "@/components/MapView";
import { MyPostsBanner } from "@/components/MyPostsBanner";
import { NearbySheet, SNAP_PEEK } from "@/components/NearbySheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/app";
import {
  COARSE_ACCURACY_M,
  formatAccuracy,
  watchLocation,
  type LocationState,
} from "@/lib/geo";
import { fetchNearbyPosts } from "@/lib/posts";
import type { Post } from "@/lib/models";

const LOCATING: LocationState = {
  fix: null,
  status: "locating",
  error: null,
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [location, setLocation] = useState<LocationState>(LOCATING);
  /** Cambiarlo reinicia la escucha del GPS: es el botón de "reintentar". */
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number>(SNAP_PEEK);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pedir la ubicación en cuanto abre — el permiso del navegador salta aquí.
  // Si la niegan seguimos: se muestran las solicitudes más recientes del país
  // en vez de una pantalla vacía.
  //
  // Es una escucha y no una lectura suelta porque la primera posición que da
  // el navegador suele ser gruesa y va afinando durante unos segundos.
  // `watchLocation` sólo avisa cuando mejora.
  useEffect(() => {
    const stop = watchLocation(setLocation);
    return stop;
  }, [locationAttempt]);

  const userLocation = location.fix?.coords ?? null;

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
  }, [userLocation, reloadKey]);

  const selected = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId],
  );

  const urgentCount = useMemo(
    () => posts.filter((post) => post.isUrgent).length,
    [posts],
  );

  const coarseFix =
    location.fix && location.fix.accuracyM > COARSE_ACCURACY_M
      ? location.fix
      : null;

  return (
    <main className="h-screen-safe relative w-full overflow-hidden">
      <MapView
        posts={posts}
        userFix={location.fix}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Barra superior: identidad + estado, sin tapar el mapa. */}
      <header className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3">
        <Card
          size="sm"
          className="pointer-events-auto flex-row items-center gap-2 bg-card/95 px-3 backdrop-blur"
        >
          {/* El `span` no es decorativo: `Card` trae reglas para la foto de
              portada de una tarjeta (`*:[img:first-child]:rounded-t-xl` y
              `has-[>img:first-child]:pt-0`). Una bandera de 24 px suelta aquí
              las activaba y salía con las esquinas de arriba redondeadas a
              16 px y la tarjeta sin padding superior. Envuelta deja de ser
              `img` hija directa y las reglas no la ven. */}
          <span className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element --
                `next/image` rechaza SVG salvo que se active
                `dangerouslyAllowSVG`, y no vamos a abrir eso en la config por
                un adorno de 255 bytes que ya pesa menos que su propia
                petición. */}
            <img
              src="/images/flag_colombia.svg"
              alt=""
              aria-hidden="true"
              width={24}
              height={16}
              className="block h-4 w-6 rounded-[3px] ring-1 ring-black/10"
            />
          </span>
          <div className="min-w-0 flex-1">
            {/* `truncate` por si el nombre crece: aquí compite con el mapa y
                no puede robarle una segunda línea. */}
            <h1 className="truncate text-sm leading-tight font-semibold">
              {APP_NAME}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {urgentCount > 0
                ? `${urgentCount} ${urgentCount === 1 ? "caso urgente" : "casos urgentes"} cerca`
                : "Quién necesita ayuda cerca de ti"}
            </p>
          </div>

          {/* Al extremo derecho y centrado en vertical. `shrink-0` para que
              sea el nombre el que se recorte, nunca el botón. */}
          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="-mr-1 shrink-0 text-muted-foreground"
          >
            <Link href="/acerca" aria-label="Acerca de la app">
              <Settings className="size-5!" aria-hidden="true" />
            </Link>
          </Button>
        </Card>

        {/* Sólo lo ve quien publicó: es su solicitud y su forma de cerrarla. */}
        <MyPostsBanner onChanged={() => setReloadKey((n) => n + 1)} />

        {isDemo && (
          <Alert className="pointer-events-auto bg-card/95 backdrop-blur">
            <AlertDescription className="text-[11px]">
              Datos de ejemplo — falta conectar Supabase (ver README).
            </AlertDescription>
          </Alert>
        )}

        {location.error && (
          <Alert className="pointer-events-auto bg-card/95 backdrop-blur">
            <AlertDescription className="flex items-center gap-2 text-[11px]">
              <span className="flex-1">{location.error}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2 text-[11px]"
                onClick={() => setLocationAttempt((n) => n + 1)}
              >
                <LocateFixed data-icon="inline-start" className="size-3.5!" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Decirlo es parte de la información: con un error de kilómetros, "a
            300 m de ti" es un dato falso y quien lo lee toma decisiones con él. */}
        {coarseFix && (
          <Alert className="pointer-events-auto bg-card/95 backdrop-blur">
            <AlertDescription className="text-[11px]">
              Ubicación aproximada ({formatAccuracy(coarseFix.accuracyM)}). Las
              distancias son orientativas.
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
