import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Camera, MapPin, MessageCircle, ShieldAlert, User } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Pedir ayuda",
};

const PENDIENTE = [
  { icon: User, texto: "Tu nombre y una foto de perfil" },
  { icon: MessageCircle, texto: "Tu número de WhatsApp para que te contacten" },
  { icon: ShieldAlert, texto: "Qué necesitas y con cuánta urgencia" },
  { icon: Camera, texto: "Una foto de la situación" },
  { icon: MapPin, texto: "Dónde estás, ajustable sobre el mapa" },
];

/**
 * Marcador de posición del formulario de publicación. Existe para que el
 * botón principal del mapa no lleve a un 404 mientras se construye la
 * siguiente etapa.
 */
export default function PedirPage() {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          Volver al mapa
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Pedir ayuda</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          El formulario para publicar una solicitud todavía no está listo. Es lo
          siguiente que se va a construir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Qué pedirá el formulario</CardTitle>
          <CardDescription>Nada de esto requiere crear una cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {PENDIENTE.map(({ icon: Icon, texto }, index) => (
            <div key={texto} className="flex flex-col gap-3">
              {index > 0 && <Separator />}
              <div className="flex items-center gap-3 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {texto}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>¿Es una emergencia ahora mismo?</AlertTitle>
        <AlertDescription>
          Llama al{" "}
          <a href="tel:123" className="font-semibold underline">
            123
          </a>
          , la línea única de emergencias.
        </AlertDescription>
      </Alert>
    </main>
  );
}
