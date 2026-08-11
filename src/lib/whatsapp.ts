import { APP_NAME } from "./app";

/** Código de país por defecto: Colombia. */
const DEFAULT_COUNTRY_CODE = "57";

/**
 * wa.me exige el número en formato internacional y sólo dígitos.
 * La gente escribe "300 123 4567", "(+57) 300-123-4567" o "03001234567";
 * todo eso tiene que terminar igual.
 */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Ya trae indicativo de país.
  if (raw.trim().startsWith("+")) return digits;
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length >= 12) return digits;

  // Celular colombiano: 10 dígitos empezando por 3.
  const local = digits.replace(/^0+/, "");
  if (local.length === 10 && local.startsWith("3")) {
    return `${DEFAULT_COUNTRY_CODE}${local}`;
  }

  // Cualquier otra cosa la dejamos pasar tal cual: mejor un enlace imperfecto
  // que bloquear a alguien con un número que no encaja en nuestro molde.
  return local.length >= 7 ? local : null;
}

export function whatsappLink(raw: string, message?: string): string | null {
  const number = normalizeWhatsapp(raw);
  if (!number) return null;

  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

/** Mensaje inicial para que quien ayuda no tenga que pensar qué escribir. */
export function defaultContactMessage(name: string): string {
  const firstName = name.split(/\s+/)[0] ?? name;
  // El nombre entero, no el corto: quien recibe esto es un desconocido y el
  // nombre es lo único que le dice de dónde sale el mensaje.
  return `Hola ${firstName}, vi tu solicitud en ${APP_NAME}. ¿Todavía necesitas ayuda?`;
}
