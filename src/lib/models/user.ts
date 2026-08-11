import { firstNameOf, initialsOf } from "./values";
import { normalizeWhatsapp, whatsappLink } from "../whatsapp";

/**
 * Fila tal como llega de `public.users`. Es una interfaz y no una clase a
 * propósito: describe el formato del cable (snake_case, JSON plano), no el
 * dominio. La clase es lo que existe después de hidratar.
 */
export interface UserRow {
  id: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
  whatsapp: string | null;
  verified_at: string | null;
}

export interface UserInit {
  id: string;
  createdAt: string;
  name: string;
  avatarUrl: string | null;
  whatsapp: string | null;
  verifiedAt: string | null;
}

/**
 * Una persona con cuenta en la plataforma.
 *
 * Dos cosas que conviene tener claras sobre este modelo:
 *
 * 1. **No es dueño de la autenticación.** `id` es el mismo uuid que
 *    `auth.users.id` de Supabase, que es quien guarda el correo, el teléfono
 *    de acceso y las contraseñas. Aquí sólo vive el perfil público. No se
 *    duplica el correo: sería una responsabilidad de privacidad sin ningún
 *    uso hoy.
 *
 * 2. **Tener cuenta no es requisito para pedir ayuda.** Una publicación puede
 *    no tener usuario detrás (`Post.userId === null`). La cuenta sirve para
 *    no volver a escribir tus datos, para cerrar tus solicitudes desde
 *    cualquier dispositivo y, más adelante, para poder verificar a quien
 *    ayuda de forma organizada.
 */
export class User {
  readonly id: string;
  readonly createdAt: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  /** Puede faltar: alguien se registra por correo y añade el número después. */
  readonly whatsapp: string | null;
  readonly verifiedAt: string | null;

  constructor(init: UserInit) {
    this.id = init.id;
    this.createdAt = init.createdAt;
    this.name = init.name;
    this.avatarUrl = init.avatarUrl;
    this.whatsapp = init.whatsapp;
    this.verifiedAt = init.verifiedAt;
  }

  static fromRow(row: UserRow): User {
    return new User({
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      avatarUrl: row.avatar_url,
      whatsapp: row.whatsapp,
      verifiedAt: row.verified_at,
    });
  }

  get initials(): string {
    return initialsOf(this.name);
  }

  get firstName(): string {
    return firstNameOf(this.name);
  }

  /**
   * Verificado por un humano del equipo: una alcaldía, una brigada, una ONG.
   * No es "confirmó su correo".
   */
  get isVerified(): boolean {
    return this.verifiedAt !== null;
  }

  /** Sin número no hay por dónde contactarle, así que no puede publicar. */
  get canPublish(): boolean {
    return normalizeWhatsapp(this.whatsapp ?? "") !== null;
  }

  whatsappLink(message?: string): string | null {
    return this.whatsapp ? whatsappLink(this.whatsapp, message) : null;
  }

  /** Copia con cambios. El modelo es inmutable para no pelearse con React. */
  with(changes: Partial<UserInit>): User {
    return new User({ ...this, ...changes });
  }

  /** Payload para actualizar el perfil. `id` y `created_at` no se tocan. */
  toRow(): Omit<UserRow, "id" | "created_at" | "verified_at"> {
    return {
      name: this.name,
      avatar_url: this.avatarUrl,
      whatsapp: this.whatsapp,
    };
  }
}
