import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedir ayuda",
};

/**
 * Marcador de posición del formulario de publicación. Existe para que el
 * botón principal del mapa no lleve a un 404 mientras se construye la
 * siguiente etapa (nombre, avatar, WhatsApp, categoría, foto y ubicación).
 */
export default function PedirPage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--color-ink-2)]"
      >
        <span aria-hidden="true">←</span> Volver al mapa
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Pedir ayuda</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
          El formulario para publicar una solicitud todavía no está listo. Es lo
          siguiente que se va a construir.
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-[var(--color-ink-2)]">
        {[
          "Tu nombre y una foto de perfil",
          "Tu número de WhatsApp para que te contacten",
          "Qué necesitas y con cuánta urgencia",
          "Una foto de la situación",
          "Dónde estás, ajustable sobre el mapa",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">·</span>
            {item}
          </li>
        ))}
      </ul>

      <p className="rounded-2xl bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-ink-2)]">
        Si necesitas ayuda urgente ahora mismo, llama al{" "}
        <a href="tel:123" className="font-semibold text-[var(--color-ink)] underline">
          123
        </a>{" "}
        (línea única de emergencias).
      </p>
    </main>
  );
}
