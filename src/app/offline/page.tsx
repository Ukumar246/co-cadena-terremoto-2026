import Link from "next/link";
import type { Metadata } from "next";
import { RotateCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sin conexión",
};

/** Lo que sirve el service worker cuando no hay red y la ruta no está en caché. */
export default function OfflinePage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-5 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        No pudimos cargar las solicitudes más recientes. No te mostramos las
        antiguas porque podrían estar ya resueltas y hacerte perder el viaje.
      </p>
      <Button asChild className="mt-2 h-12 w-full text-base">
        <Link href="/">
          <RotateCw data-icon="inline-start" />
          Reintentar
        </Link>
      </Button>
    </main>
  );
}
