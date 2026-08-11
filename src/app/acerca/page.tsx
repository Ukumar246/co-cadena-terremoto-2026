import type { Metadata } from "next";
import Link from "next/link";
// Sin icono de GitHub: Lucide quitó las marcas de su catálogo. `GitFork` dice
// lo mismo y es lo que se espera hacer con el repo.
import { ArrowLeft, Code2, GitFork, HeartHandshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_PUBLISHED_AT,
  APP_REPO_URL,
  EARTHQUAKE,
} from "@/lib/app";

export const metadata: Metadata = {
  title: "Acerca de la app",
  description: APP_DESCRIPTION,
};

/** "10 de agosto de 2026, 7:34 a. m." — huso de Colombia, no el del servidor. */
function formatColombianDateTime(iso: string, withTime = true): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

interface FactProps {
  label: string;
  children: React.ReactNode;
}

/**
 * Una fila de la ficha. Es `<dl>` y no `<table>` porque esto son pares
 * etiqueta/valor, no una rejilla de datos: un lector de pantalla anuncia
 * "Nombre: …" en vez de recitar coordenadas de celda.
 */
function Fact({ label, children }: FactProps) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-[15px] break-words">{children}</dd>
    </div>
  );
}

export default function AcercaPage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" className="size-4!" />
          Volver al mapa
        </Link>
      </Button>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Acerca de la app</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {APP_DESCRIPTION}
        </p>
      </header>

      {/* --- Ficha ---------------------------------------------------- */}
      <Card size="sm" className="px-4">
        <dl className="divide-y divide-border">
          <Fact label="Nombre">{APP_NAME}</Fact>

          <Fact label="Última publicación">
            {APP_PUBLISHED_AT ? (
              <time dateTime={APP_PUBLISHED_AT}>
                {formatColombianDateTime(APP_PUBLISHED_AT)}
              </time>
            ) : (
              "—"
            )}
          </Fact>

          <Fact label="Código fuente">
            <a
              href={APP_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-strong underline underline-offset-2"
            >
              {APP_REPO_URL.replace("https://", "")}
            </a>
          </Fact>

          <Fact label="Terremoto">
            Magnitud {EARTHQUAKE.magnitude} ·{" "}
            <time dateTime={EARTHQUAKE.occurredAt}>
              {formatColombianDateTime(EARTHQUAKE.occurredAt)}
            </time>
            <br />
            {EARTHQUAKE.epicentre}
          </Fact>

          <Fact label="Países afectados">
            {EARTHQUAKE.countries.join(", ")}
          </Fact>
        </dl>
      </Card>

      {/* --- Por qué existe ------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <HeartHandshake className="size-5 text-primary-strong" aria-hidden="true" />
          Software libre, hecho para ayudar
        </h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Esta aplicación es de código abierto y se hizo con una sola intención:
          ayudar a las personas de Colombia que están pasando por la crisis del
          terremoto de magnitud {EARTHQUAKE.magnitude} que sacudió la región el{" "}
          {formatColombianDateTime(EARTHQUAKE.occurredAt, false)}, con epicentro
          a 9 km de El Cairo, Valle del Cauca, y que también se sintió en
          Ecuador y Panamá.
        </p>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          En una emergencia así lo que sostiene a un barrio no son las
          instituciones que tardan en llegar, sino los vecinos. Tenemos que
          ayudarnos entre nosotros, como comunidad: quien tiene agua, quien
          tiene carro, quien tiene un piso seco donde pasar la noche. Esta app
          sólo intenta que esa gente se encuentre más rápido.
        </p>
      </section>

      <Separator />

      {/* --- Llamada a colaborar -------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Code2 className="size-5 text-primary-strong" aria-hidden="true" />
          Nos hace mucha falta ayuda
        </h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Hace mucha falta ayuda para programar y mantener esta aplicación. Si
          sabes de desarrollo —o de diseño, de traducción, de probar en
          teléfonos viejos— tu tiempo aquí se convierte directamente en gente
          atendida. Cualquier aporte sirve, por pequeño que sea.
        </p>

        <Button asChild size="lg" className="w-full">
          <a href={APP_REPO_URL} target="_blank" rel="noopener noreferrer">
            <GitFork data-icon="inline-start" className="size-5!" />
            Colaborar en GitHub
          </a>
        </Button>
      </section>
    </main>
  );
}
