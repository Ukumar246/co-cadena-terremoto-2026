import { getSupabaseBrowserClient } from "./supabase/client";

const BUCKET = "photos";

/** Lo que acepta el bucket (ver `schema.sql`). */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * El bucket tiene un tope de 8 MB y las cámaras de móvil sacan fotos de más.
 * Se reescalan en el navegador antes de subirlas: en una zona de desastre la
 * red es lo escaso, y una foto de 4 MB puede no llegar nunca.
 *
 * Los HEIC de iPhone no los sabe decodificar `createImageBitmap` en todos los
 * navegadores; si falla, se sube el original tal cual y que decida el bucket.
 */
async function downscale(file: File, maxSide: number): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= MAX_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export interface UploadOptions {
  /** Lado mayor en píxeles tras el reescalado. */
  maxSide?: number;
  /** Carpeta dentro del bucket: `avatars` o `posts`. */
  folder: string;
}

/** Sube una imagen y devuelve su URL pública. */
export async function uploadImage(
  file: File,
  { folder, maxSide = 1280 }: UploadOptions,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("La app está en modo demo: falta configurar Supabase.");
  }

  if (file.type && !ALLOWED.includes(file.type)) {
    throw new Error("Ese formato de imagen no se admite. Usa JPG, PNG o WEBP.");
  }

  const blob = await downscale(file, maxSide);
  if (blob.size > MAX_BYTES) {
    throw new Error("La imagen pesa demasiado. Prueba con una más pequeña.");
  }

  const extension = blob.type === "image/jpeg" ? "jpg" : "png";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
