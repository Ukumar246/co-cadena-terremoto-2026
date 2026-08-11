"use client";

import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/models";

interface PostCardProps {
  post: Post;
  onSelect: (id: string) => void;
  active?: boolean;
}

export function PostCard({ post, onSelect, active = false }: PostCardProps) {
  const category = post.categoryMeta;

  return (
    <button
      type="button"
      onClick={() => onSelect(post.id)}
      aria-current={active ? "true" : undefined}
      className="w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card
        size="sm"
        className={cn(
          "transition-colors",
          active ? "bg-muted ring-foreground/25" : "active:bg-muted",
        )}
      >
        <CardContent className="flex gap-3">
          <Avatar
            className="size-11"
            // El aro reutiliza el color de la categoría: la tarjeta y el pin
            // del mapa son reconociblemente la misma persona.
            style={{ boxShadow: `0 0 0 2px ${category.color}` }}
          >
            {post.avatarUrl && (
              <AvatarImage asChild src={post.avatarUrl}>
                <Image src={post.avatarUrl} alt="" width={44} height={44} />
              </AvatarImage>
            )}
            <AvatarFallback className="font-semibold">{post.initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-semibold">{post.name}</span>
              {post.distanceM != null && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  a {post.distanceLabel}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge
                className="border-transparent text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.emoji} {category.label}
              </Badge>
              {post.isUrgent && (
                <Badge variant="destructive">{post.urgencyMeta.label}</Badge>
              )}
            </div>

            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {post.description}
            </p>

            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{post.age}</span>
              {post.addressLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{post.addressLabel}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
