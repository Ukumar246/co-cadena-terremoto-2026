import type { MetadataRoute } from "next";

import { APP_NAME, APP_SHORT_NAME } from "@/lib/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description:
      "Mira quién necesita ayuda cerca de ti y publica tu propia solicitud.",
    lang: "es-CO",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f5c4a",
    categories: ["social", "utilities", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Pedir ayuda",
        short_name: "Pedir ayuda",
        url: "/pedir",
        description: "Publica una solicitud de ayuda",
      },
    ],
  };
}
