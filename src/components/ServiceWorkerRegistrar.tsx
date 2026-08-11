"use client";

import { useEffect } from "react";

/**
 * Registra el service worker en producción. En desarrollo estorba más de lo
 * que ayuda (sirve builds viejos), así que ahí se desregistra solo.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Sin service worker la app sigue funcionando online: no molestamos.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
