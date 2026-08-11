import Image from "next/image";
import { initialsOf } from "@/lib/models";

interface AvatarProps {
  name: string;
  src: string | null;
  size?: number;
  ringColor?: string;
}

/**
 * Deliberadamente tonto: recibe nombre y foto sueltos en vez de un `Post` o un
 * `User`, así sirve para los dos sin conocer ninguno de los dos modelos.
 */
export function Avatar({ name, src, size = 44, ringColor }: AvatarProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-2)]"
      style={{
        width: size,
        height: size,
        boxShadow: ringColor ? `0 0 0 2px ${ringColor}` : undefined,
      }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{ fontSize: size * 0.36 }}
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
