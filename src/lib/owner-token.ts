const STORAGE_KEY = "ayuda-ya:owner-token";

/**
 * Identifica al dispositivo que publicó una solicitud, sin cuentas de por
 * medio: es lo único que permite después cerrarla desde la app.
 *
 * Es un secreto portador, no una identidad. Quien lo tenga puede cerrar esas
 * solicitudes, y borrar los datos del navegador las deja huérfanas para
 * siempre. Ambas cosas son aceptables para algo que vive siete días; ninguna
 * lo sería con cuentas de verdad.
 */
/**
 * El token existente, sin crear uno nuevo.
 *
 * Es lo que usa el aviso de "tu solicitud sigue abierta": mirar no puede
 * tener efectos. Con `getOwnerToken()` cada visitante acabaría marcado con un
 * token en cuanto abriera el mapa, sin haber publicado nada.
 */
export function peekOwnerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    return existing && existing.length >= 16 ? existing : null;
  } catch {
    return null;
  }
}

export function getOwnerToken(): string {
  if (typeof window === "undefined") {
    throw new Error("El token del dispositivo sólo existe en el navegador.");
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 16) return existing;

    const token = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se publica igual, pero esa
    // solicitud no se podrá cerrar desde este navegador. Mejor eso que
    // impedir pedir ayuda.
    return crypto.randomUUID();
  }
}
