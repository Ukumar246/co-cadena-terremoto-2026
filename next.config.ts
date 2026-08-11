import type { NextConfig } from "next";

/**
 * Las fotos y avatares viven en Supabase Storage, cuyo host depende del
 * proyecto. Se deriva de la variable de entorno en vez de escribirlo a mano
 * para que no haya que tocar este archivo al cambiar de entorno.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        // El service worker no debe quedarse cacheado: si no, una versión
        // vieja puede seguir sirviendo la app durante horas.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
