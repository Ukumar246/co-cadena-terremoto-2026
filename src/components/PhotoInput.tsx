"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/storage";

interface PhotoInputProps {
  label: string;
  hint?: string;
  folder: string;
  maxSide?: number;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Recorte circular para el avatar, rectangular para la foto. */
  shape?: "circle" | "wide";
}

/**
 * Selector de imagen que sube al bucket en cuanto se elige.
 *
 * Se sube al momento y no al enviar el formulario a propósito: así el envío
 * final es una sola llamada rápida y, si la red falla, falla mientras la
 * persona todavía está mirando la pantalla y puede reintentar — no al final,
 * cuando cree que ya terminó.
 */
export function PhotoInput({
  label,
  hint,
  folder,
  maxSide,
  value,
  onChange,
  shape = "wide",
}: PhotoInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadImage(file, { folder, maxSide }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  const isCircle = shape === "circle";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div
          className={`relative shrink-0 overflow-hidden bg-muted ${
            isCircle ? "size-16 rounded-full" : "h-20 w-28 rounded-lg"
          }`}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="size-5 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : value ? "Cambiar" : label}
          </Button>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>

        {value && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Quitar imagen"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X />
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        // `capture` no se fuerza: mucha gente ya tiene la foto hecha y
        // obligarles a abrir la cámara les haría perderla.
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
