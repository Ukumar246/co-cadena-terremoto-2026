import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión",
};

/** Lo que sirve el service worker cuando no hay red y la ruta no está en caché. */
export default function OfflinePage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5 py-6 text-center">
      <p className="text-4xl" aria-hidden="true">
        📡
      </p>
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
        No pudimos cargar las solicitudes más recientes. No te mostramos las
        antiguas porque podrían estar ya resueltas y hacerte perder el viaje.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-2xl bg-[var(--color-urgent)] px-5 py-3.5 font-semibold text-white"
      >
        Reintentar
      </Link>
    </main>
  );
}
