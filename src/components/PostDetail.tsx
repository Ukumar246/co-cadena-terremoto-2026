"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AtSign,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatform, type Post, type PostWithContact } from "@/lib/models";
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
  const CategoryIcon = category.icon;
  const waLink = detail?.contactLink() ?? null;
  const proofLink = detail?.socialProofLink() ?? null;
  const proofPlatform = detail ? getPlatform(detail.socialPlatform) : null;

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft data-icon="inline-start" />
        Volver a la lista
      </Button>

      <div className="flex gap-3">
        <Avatar
          className="size-14"
          style={{ boxShadow: `0 0 0 2px ${category.color}` }}
        >
          {post.avatarUrl && (
            <AvatarImage asChild src={post.avatarUrl}>
              <Image src={post.avatarUrl} alt="" width={56} height={56} />
            </AvatarImage>
          )}
          <AvatarFallback className="text-base font-semibold">
            {post.initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{post.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: category.color }}
            >
              <CategoryIcon aria-hidden="true" />
              {category.label}
            </Badge>
            <Badge variant={post.isUrgent ? "destructive" : "secondary"}>
              {post.urgencyMeta.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {post.age}
            {post.distanceM != null && ` · a ${post.distanceLabel} de ti`}
          </p>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed">{post.description}</p>

      {post.photoUrl && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
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
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {post.addressLabel}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {waLink ? (
          <Button
            asChild
            // Verde de WhatsApp: aquí el color es reconocimiento de marca, no
            // decoración, así que no sale de los tokens del tema.
            className="h-13 bg-[#25d366] text-base text-white hover:bg-[#1fb457]"
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle data-icon="inline-start" className="size-5!" />
              Escribir por WhatsApp
            </a>
          </Button>
        ) : error ? (
          <div className="flex h-13 items-center justify-center rounded-lg bg-muted px-4 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <Skeleton className="h-13 w-full rounded-lg" />
        )}

        <Button asChild variant="outline" className="h-11">
          <a href={post.directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation data-icon="inline-start" />
            Cómo llegar
          </a>
        </Button>

        {/* El respaldo en redes: quien va a moverse puede comprobar por su
            cuenta que detrás hay una persona con rastro público. */}
        {proofLink && (
          <Button asChild variant="ghost" className="h-11 text-muted-foreground">
            <a href={proofLink} target="_blank" rel="noopener noreferrer">
              {detail?.socialUrl ? (
                <ExternalLink data-icon="inline-start" />
              ) : (
                <AtSign data-icon="inline-start" />
              )}
              {detail?.socialUrl
                ? `Ver la publicación${proofPlatform && proofPlatform.id !== "otra" ? ` en ${proofPlatform.label}` : ""}`
                : `@${detail?.socialHandle} en ${proofPlatform?.label ?? "redes"}`}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
