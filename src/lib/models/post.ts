import { getCategory, getUrgency, type CategoryMeta, type UrgencyMeta } from "../categories";
import { formatAge, formatDistance } from "../geo";
import { defaultContactMessage, normalizeWhatsapp, whatsappLink } from "../whatsapp";
import type { User } from "./user";
import {
  Coords,
  firstNameOf,
  initialsOf,
  type PostCategory,
  type PostStatus,
  type Urgency,
} from "./values";

/** Formato del cable para el listado del mapa. Sin teléfono, a propósito. */
export interface PostRow {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string;
  avatar_url: string | null;
  category: string;
  description: string;
  lat: number;
  lng: number;
  address_label: string | null;
  photo_url: string | null;
  urgency: string;
  status: string;
  distance_m: number | null;
}

/** Formato del cable para el detalle. Éste sí trae el teléfono. */
export interface PostWithContactRow extends PostRow {
  whatsapp: string;
}

export interface PostInit {
  id: string;
  createdAt: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  category: PostCategory;
  description: string;
  coords: Coords;
  addressLabel: string | null;
  photoUrl: string | null;
  urgency: Urgency;
  status: PostStatus;
  distanceM: number | null;
}

/**
 * Una solicitud de ayuda: quién, qué necesita, dónde y qué pasó.
 *
 * El nombre, el avatar y el teléfono viven en la propia publicación aunque
 * exista `userId`. No es un descuido: son una *foto fija* del momento en que
 * se publicó. Así una solicitud sigue siendo contactable aunque su autor
 * borre la cuenta, y quien pide ayuda sin registrarse no necesita a nadie
 * detrás.
 *
 * Inmutable: los campos son `readonly` y toda modificación devuelve una
 * instancia nueva, que es lo que React necesita para detectar el cambio.
 */
export class Post {
  readonly id: string;
  readonly createdAt: string;
  /** null cuando se publicó sin cuenta. */
  readonly userId: string | null;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly category: PostCategory;
  readonly description: string;
  readonly coords: Coords;
  readonly addressLabel: string | null;
  readonly photoUrl: string | null;
  readonly urgency: Urgency;
  readonly status: PostStatus;
  /**
   * Metros desde quien está consultando. No es un dato de la publicación sino
   * de la pregunta: la misma solicitud está a 300 m de una persona y a 4 km
   * de otra. Por eso lo calcula la consulta y no hay columna en la tabla.
   */
  readonly distanceM: number | null;

  constructor(init: PostInit) {
    this.id = init.id;
    this.createdAt = init.createdAt;
    this.userId = init.userId;
    this.name = init.name;
    this.avatarUrl = init.avatarUrl;
    this.category = init.category;
    this.description = init.description;
    this.coords = init.coords;
    this.addressLabel = init.addressLabel;
    this.photoUrl = init.photoUrl;
    this.urgency = init.urgency;
    this.status = init.status;
    this.distanceM = init.distanceM;
  }

  static fromRow(row: PostRow): Post {
    return new Post(Post.initFromRow(row));
  }

  /** Compartido con `PostWithContact` para no repetir el mapeo. */
  protected static initFromRow(row: PostRow): PostInit {
    return {
      id: row.id,
      createdAt: row.created_at,
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      category: row.category as PostCategory,
      description: row.description,
      coords: new Coords(row.lat, row.lng),
      addressLabel: row.address_label,
      photoUrl: row.photo_url,
      urgency: row.urgency as Urgency,
      status: row.status as PostStatus,
      distanceM: row.distance_m,
    };
  }

  /** Metadatos de presentación: color del pin, etiqueta, emoji. */
  get categoryMeta(): CategoryMeta {
    return getCategory(this.category);
  }

  get urgencyMeta(): UrgencyMeta {
    return getUrgency(this.urgency);
  }

  get isUrgent(): boolean {
    return this.urgency === "alta";
  }

  get isActive(): boolean {
    return this.status === "active";
  }

  /** True si detrás hay una cuenta y no una publicación anónima. */
  get hasAccount(): boolean {
    return this.userId !== null;
  }

  get initials(): string {
    return initialsOf(this.name);
  }

  get firstName(): string {
    return firstNameOf(this.name);
  }

  /** "hace 5 min" */
  get age(): string {
    return formatAge(this.createdAt);
  }

  /** "350 m" · cadena vacía si se consultó sin ubicación. */
  get distanceLabel(): string {
    return formatDistance(this.distanceM);
  }

  get directionsUrl(): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${this.coords.lat},${this.coords.lng}`;
  }

  /** Recalcula la distancia respecto a otro origen. */
  withDistanceFrom(origin: Coords): Post {
    return new Post({ ...this, distanceM: origin.distanceTo(this.coords) });
  }

  with(changes: Partial<PostInit>): Post {
    return new Post({ ...this, ...changes });
  }
}

/**
 * Una solicitud con su teléfono. Sólo la devuelve `post_detail`, de a una.
 *
 * La separación no es cosmética: un componente que recibe un `Post` no puede
 * pintar un enlace de WhatsApp porque el campo no existe. La regla la impone
 * el compilador, no la disciplina de quien escribe la vista.
 */
export class PostWithContact extends Post {
  readonly whatsapp: string;

  constructor(init: PostInit & { whatsapp: string }) {
    super(init);
    this.whatsapp = init.whatsapp;
  }

  static override fromRow(row: PostWithContactRow): PostWithContact {
    return new PostWithContact({ ...Post.initFromRow(row), whatsapp: row.whatsapp });
  }

  /** Enlace a wa.me con el saludo ya escrito. */
  contactLink(): string | null {
    return whatsappLink(this.whatsapp, defaultContactMessage(this.name));
  }
}

export interface NewPostInit {
  name: string;
  avatarUrl: string | null;
  whatsapp: string;
  category: PostCategory;
  description: string;
  coords: Coords;
  addressLabel: string | null;
  photoUrl: string | null;
  urgency: Urgency;
}

/**
 * Una solicitud todavía sin publicar: lo que el formulario va llenando.
 *
 * No lleva `id`, `status` ni `createdAt` porque son del servidor, ni
 * `ownerToken` porque eso identifica al dispositivo, no a la solicitud.
 *
 * `validate()` repite a propósito los límites que ya impone el CHECK de la
 * tabla. La base de datos es la que manda — la RPC es pública y hay que
 * asumir que alguien la llamará sin pasar por el formulario — pero avisar
 * antes del viaje de ida y vuelta es la diferencia entre corregir un campo y
 * perder el intento con mala señal.
 */
export class NewPost {
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly whatsapp: string;
  readonly category: PostCategory;
  readonly description: string;
  readonly coords: Coords;
  readonly addressLabel: string | null;
  readonly photoUrl: string | null;
  readonly urgency: Urgency;

  constructor(init: NewPostInit) {
    this.name = init.name;
    this.avatarUrl = init.avatarUrl;
    this.whatsapp = init.whatsapp;
    this.category = init.category;
    this.description = init.description;
    this.coords = init.coords;
    this.addressLabel = init.addressLabel;
    this.photoUrl = init.photoUrl;
    this.urgency = init.urgency;
  }

  /** Arranca el formulario con los datos de la cuenta ya puestos. */
  static forUser(user: User, init: Partial<NewPostInit> & { coords: Coords }): NewPost {
    return new NewPost({
      name: user.name,
      avatarUrl: user.avatarUrl,
      whatsapp: user.whatsapp ?? "",
      category: "otro",
      description: "",
      addressLabel: null,
      photoUrl: null,
      urgency: "media",
      ...init,
    });
  }

  with(changes: Partial<NewPostInit>): NewPost {
    return new NewPost({ ...this, ...changes });
  }

  /** Mensajes listos para mostrar, en el orden en que aparecen los campos. */
  validate(): string[] {
    const problems: string[] = [];
    const name = this.name.trim();
    const description = this.description.trim();

    if (name.length < 2 || name.length > 60) {
      problems.push("Escribe tu nombre (entre 2 y 60 caracteres).");
    }
    if (!normalizeWhatsapp(this.whatsapp)) {
      problems.push("Necesitamos un número de WhatsApp válido para que te contacten.");
    }
    if (description.length < 5) {
      problems.push("Cuéntanos con qué necesitas ayuda.");
    } else if (description.length > 500) {
      problems.push("La descripción no puede pasar de 500 caracteres.");
    }
    if (!Coords.parse(this.coords.lat, this.coords.lng)) {
      problems.push("Marca en el mapa dónde necesitas la ayuda.");
    }
    return problems;
  }

  get isValid(): boolean {
    return this.validate().length === 0;
  }

  /**
   * Argumentos de `create_post`. El `user_id` no va aquí: lo resuelve la
   * función en el servidor con `auth.uid()`, que es el único dato de sesión
   * en el que se puede confiar.
   */
  toRpcArgs(ownerToken: string): Record<string, unknown> {
    return {
      in_name: this.name.trim(),
      in_whatsapp: this.whatsapp.trim(),
      in_category: this.category,
      in_description: this.description.trim(),
      in_lat: this.coords.lat,
      in_lng: this.coords.lng,
      in_owner_token: ownerToken,
      in_avatar_url: this.avatarUrl,
      in_address_label: this.addressLabel?.trim() || null,
      in_photo_url: this.photoUrl,
      in_urgency: this.urgency,
    };
  }
}
