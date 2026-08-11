import Image from "next/image";

interface AvatarProps {
  name: string;
  src: string | null;
  size?: number;
  ringColor?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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
          {initials(name)}
        </span>
      )}
    </div>
  );
}
