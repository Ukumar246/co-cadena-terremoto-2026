"use client";

import { useEffect, useRef } from "react";

import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";
import type { Post } from "@/lib/models";

interface NearbySheetProps {
  posts: Post[];
  selected: Post | null;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelect: (id: string | null) => void;
}

/**
 * Hoja inferior con las solicitudes cercanas. Dos alturas: asomada (se ve el
 * mapa) y abierta (se lee la lista). Al elegir una solicitud pasa a modo
 * detalle, que es donde aparece el contacto.
 */
export function NearbySheet({
  posts,
  selected,
  loading,
  error,
  expanded,
  onToggleExpanded,
  onSelect,
}: NearbySheetProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Al cambiar entre lista y detalle, empezar arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);

  const showDetail = selected !== null;
  const height = showDetail ? "72dvh" : expanded ? "68dvh" : "27dvh";

  return (
    <section
      aria-label="Solicitudes de ayuda cerca de ti"
      className="pb-safe absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_-8px_32px_rgb(0_0_0/0.16)] transition-[height] duration-300 ease-out"
      style={{ height }}
    >
      <button
        type="button"
        onClick={showDetail ? () => onSelect(null) : onToggleExpanded}
        aria-expanded={showDetail || expanded}
        className="flex w-full shrink-0 flex-col items-center gap-2 px-4 pt-2.5 pb-2"
      >
        <span
          aria-hidden="true"
          className="h-1 w-10 rounded-full bg-[var(--color-line)]"
        />
        {!showDetail && (
          <span className="w-full text-left text-sm font-semibold">
            {loading
              ? "Buscando cerca de ti…"
              : posts.length === 0
                ? "Nadie ha pedido ayuda por aquí"
                : `${posts.length} ${posts.length === 1 ? "persona necesita" : "personas necesitan"} ayuda cerca`}
          </span>
        )}
      </button>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
      >
        {error && (
          <p className="rounded-2xl bg-[var(--color-urgent)]/10 p-3 text-sm text-[var(--color-urgent)]">
            {error}
          </p>
        )}

        {showDetail ? (
          <PostDetail key={selected.id} post={selected} onBack={() => onSelect(null)} />
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onSelect={onSelect} />
            ))}

            {!loading && posts.length === 0 && !error && (
              <p className="py-6 text-center text-sm text-[var(--color-ink-2)]">
                Bien por ahora. Si tú necesitas algo, publícalo y quien esté cerca
                lo verá.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
