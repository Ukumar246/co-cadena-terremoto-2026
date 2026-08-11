import type { Metadata } from "next";

import { PedirForm } from "@/components/PedirForm";

export const metadata: Metadata = {
  title: "Pedir ayuda",
  description:
    "Publica una solicitud de ayuda para que quien esté cerca pueda verte en el mapa y escribirte.",
};

/**
 * La página se queda en el servidor sólo para conservar los metadatos; todo
 * el formulario es cliente porque necesita GPS, cámara y subida de archivos.
 */
export default function PedirPage() {
  return <PedirForm />;
}
