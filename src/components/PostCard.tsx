"use client";

import { Avatar } from "./Avatar";
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
      className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] active:bg-[var(--color-surface-2)]"
      }`}
    >
      <Avatar name={post.name} src={post.avatarUrl} ringColor={category.color} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-semibold">{post.name}</span>
          {post.distanceM != null && (
            <span className="shrink-0 text-xs text-[var(--color-ink-2)]">
              a {post.distanceLabel}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: category.color }}
          >
            {category.emoji} {category.label}
          </span>
          {post.isUrgent && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: post.urgencyMeta.color }}
            >
              {post.urgencyMeta.label}
            </span>
          )}
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-ink-2)]">
          {post.description}
        </p>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-ink-2)]">
          <span>{post.age}</span>
          {post.addressLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{post.addressLabel}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
