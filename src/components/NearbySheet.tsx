"use client";

import { useEffect, useRef } from "react";

import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post } from "@/lib/models";

/** Fracciones de la altura de pantalla: asomado y abierto. */
export const SNAP_PEEK = 0.27;
export const SNAP_OPEN = 0.72;

interface NearbySheetProps {
  posts: Post[];
  selected: Post | null;
  loading: boolean;
  error: string | null;
  snap: number;
  onSnapChange: (snap: number) => void;
  onSelect: (id: string | null) => void;
}

/**
 * Cajón inferior con las solicitudes cercanas, sobre el `Drawer` de shadcn
 * (vaul). Se configura de una forma poco habitual y a propósito:
 *
 *   open + dismissible={false}  → nunca se cierra; la lista es la mitad de la app
 *   modal={false}               → el mapa de detrás se puede tocar y arrastrar
 *   overlay={false}             → sin velo: el mapa tiene que verse nítido
 *   snapPoints                  → arrastrable de verdad entre asomado y abierto
 *
 * Lo que se gana respecto a la versión anterior hecha a mano es el gesto: se
 * sube y se baja arrastrando, no sólo tocando.
 */
export function NearbySheet({
  posts,
  selected,
  loading,
  error,
  snap,
  onSnapChange,
  onSelect,
}: NearbySheetProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Al cambiar entre lista y detalle, empezar arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);

  const showDetail = selected !== null;
  const title = loading
    ? "Buscando cerca de ti…"
    : posts.length === 0
      ? "Nadie ha pedido ayuda por aquí"
      : `${posts.length} ${posts.length === 1 ? "persona necesita" : "personas necesitan"} ayuda cerca`;

  return (
    <Drawer
      open
      modal={false}
      dismissible={false}
      snapPoints={[SNAP_PEEK, SNAP_OPEN]}
      activeSnapPoint={snap}
      setActiveSnapPoint={(value) => {
        if (typeof value === "number") onSnapChange(value);
      }}
    >
      {/*
        `h-[100dvh]` no es decorativo: vaul coloca el cajón con
        `translateY(altura_de_pantalla × (1 − snap))` dando por supuesto que el
        contenido mide una pantalla completa. Con la altura automática de
        shadcn el panel medía menos que ese desplazamiento y se iba entero por
        debajo del borde inferior.

        Como sólo se ve la fracción `snap`, el contenido interior se limita a
        esa misma fracción: si no, la parte de abajo de la lista quedaría fuera
        de la pantalla y sería imposible llegar a ella.
      */}
      <DrawerContent
        overlay={false}
        aria-label="Solicitudes de ayuda cerca de ti"
        // Las clases base de shadcn ponen `mt-24` y `max-h-[80vh]` detrás del
        // variante `data-[vaul-drawer-direction=bottom]:`. Hay que anularlas
        // con ese mismo prefijo: sin él, tailwind-merge las ve como reglas
        // distintas y las deja convivir — el `max-h` ganaba y el cajón se
        // quedaba en 80vh en vez de la pantalla completa que vaul asume.
        className="h-[100dvh] rounded-t-3xl shadow-[0_-8px_32px_rgb(0_0_0/0.16)] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none [&>div:first-child]:hidden"
      >
        <div
          className="flex min-h-0 flex-col transition-[height] duration-300"
          style={{ height: `calc(${snap * 100}dvh)` }}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border"
          />

          <div className="px-4 pt-1.5 pb-2">
            {showDetail ? (
              <>
                {/* vaul exige título y descripción accesibles aunque no se pinten. */}
                <DrawerTitle className="sr-only">{selected.name}</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Detalle de la solicitud de ayuda
                </DrawerDescription>
              </>
            ) : (
              <>
                <DrawerTitle className="text-left text-sm font-semibold">
                  {title}
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Lista de solicitudes de ayuda ordenadas por urgencia y
                  cercanía
                </DrawerDescription>
              </>
            )}
          </div>

          <div
            ref={scrollRef}
            className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          >
            {error && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showDetail ? (
              <PostDetail
                key={selected.id}
                post={selected}
                onBack={() => onSelect(null)}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {loading && posts.length === 0 && (
                  <>
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </>
                )}

                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onSelect={onSelect} />
                ))}

                {!loading && posts.length === 0 && !error && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Bien por ahora. Si tú necesitas algo, publícalo y quien esté
                    cerca lo verá.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
