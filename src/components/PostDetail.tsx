"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Avatar } from "./Avatar";
import type { Post, PostWithContact } from "@/lib/models";
import { fetchPostDetail } from "@/lib/posts";

interface PostDetailProps {
  post: Post;
  onBack: () => void;
}

/**
 * El número de WhatsApp no viene con el listado del mapa — un `Post` ni
 * siquiera tiene el campo. Se pide aquí, al abrir una solicitud concreta, y se
 * resuelve antes de pintar el botón para que el enlace sea un `<a>` de verdad
 * y no lo bloquee el navegador.
 */
export function PostDetail({ post, onBack }: PostDetailProps) {
  const [detail, setDetail] = useState<PostWithContact | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El componente se monta con `key={post.id}`, así que no hace falta limpiar
  // el estado al cambiar de solicitud: llega vacío de fábrica.
  useEffect(() => {
    let cancelled = false;

    fetchPostDetail(post.id)
      .then((result) => {
        if (cancelled) return;
        if (result) setDetail(result);
        else setError("Esta solicitud ya no está disponible.");
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el contacto. Revisa tu conexión.");
      });

    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const category = post.categoryMeta;
  const urgency = post.urgencyMeta;
  const waLink = detail?.contactLink() ?? null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex w-fit items-center gap-1 text-sm font-medium text-[var(--color-ink-2)]"
      >
        <span aria-hidden="true">←</span> Volver a la lista
      </button>

      <div className="flex gap-3">
        <Avatar name={post.name} src={post.avatarUrl} size={56} ringColor={category.color} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{post.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: category.color }}
            >
              {category.emoji} {category.label}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: urgency.color }}
            >
              {urgency.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-ink-2)]">
            {post.age}
            {post.distanceM != null && ` · a ${post.distanceLabel} de ti`}
          </p>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed">{post.description}</p>

      {post.photoUrl && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--color-surface-2)]">
          <Image
            src={post.photoUrl}
            alt={`Foto de la situación de ${post.name}`}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover"
          />
        </div>
      )}

      {post.addressLabel && (
        <p className="text-sm text-[var(--color-ink-2)]">
          <span aria-hidden="true">📍</span> {post.addressLabel}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-3.5 text-base font-semibold text-white active:brightness-95"
          >
            Escribir por WhatsApp
          </a>
        ) : (
          <div className="flex h-13 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 py-3.5 text-sm text-[var(--color-ink-2)]">
            {error ?? "Cargando contacto…"}
          </div>
        )}

        <a
          href={post.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-medium active:bg-[var(--color-surface-2)]"
        >
          Cómo llegar
        </a>
      </div>
    </div>
  );
}
