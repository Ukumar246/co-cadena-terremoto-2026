"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleCheckBig, Loader2, Send, TriangleAlert } from "lucide-react";

import { LocationPicker } from "./LocationPicker";
import { PhotoInput } from "./PhotoInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, URGENCIES } from "@/lib/categories";
import { DEFAULT_CENTER } from "@/lib/config";
import { watchLocation, type LocationState } from "@/lib/geo";
import { Coords, NewPost, type PostCategory, type Urgency } from "@/lib/models";
import { getOwnerToken } from "@/lib/owner-token";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const LOCATING: LocationState = { fix: null, status: "locating", error: null };
const FALLBACK_CENTER = new Coords(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
const MAX_DESCRIPTION = 500;

export function PedirForm() {
  const [location, setLocation] = useState<LocationState>(LOCATING);
  const [coords, setCoords] = useState<Coords | null>(null);

  const [category, setCategory] = useState<PostCategory | null>(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [addressLabel, setAddressLabel] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [problems, setProblems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  // El pin arranca en el GPS, pero sólo la primera vez: en cuanto la persona
  // lo mueve, manda su decisión y no una lectura posterior del navegador.
  useEffect(
    () =>
      watchLocation((state) => {
        setLocation(state);
        setCoords((current) => current ?? state.fix?.coords ?? null);
      }),
    [],
  );

  const stillLocating = location.status === "locating" && coords === null;
  const pinCoords = coords ?? FALLBACK_CENTER;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!category) {
      setProblems(["Elige con qué necesitas ayuda."]);
      return;
    }

    const draft = new NewPost({
      name,
      avatarUrl,
      whatsapp,
      category,
      description,
      coords: pinCoords,
      addressLabel: addressLabel.trim() || null,
      photoUrl,
      urgency,
    });

    const found = draft.validate();
    if (found.length > 0) {
      setProblems(found);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setProblems([]);
    setSubmitting(true);
    try {
      setPublishedId(await createPost(draft, getOwnerToken()));
    } catch (cause) {
      setProblems([
        cause instanceof Error ? cause.message : "No pudimos publicar tu solicitud.",
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (publishedId) {
    return (
      <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <CircleCheckBig className="size-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold">Tu solicitud ya está en el mapa</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Quien esté cerca puede verla y escribirte por WhatsApp. Se retira sola
          a los 7 días.
        </p>
        <Button asChild className="mt-2 h-12 w-full text-base">
          <Link href="/">Ver el mapa</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-4">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground"
        >
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Volver al mapa
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold">Pedir ayuda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No hace falta registrarse. Sólo lo necesario para que alguien cerca
          pueda llegar hasta ti.
        </p>
      </div>

      {problems.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Falta algo antes de publicar</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">
            ¿Con qué necesitas ayuda?
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((option) => {
              const Icon = option.icon;
              const selected = category === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-colors",
                    selected
                      ? "border-transparent text-white"
                      : "border-border active:bg-muted",
                  )}
                  style={selected ? { backgroundColor: option.color } : undefined}
                >
                  <Icon
                    className="size-5"
                    style={selected ? undefined : { color: option.color }}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="descripcion" className="text-sm font-semibold">
            Cuéntanos qué pasa
          </Label>
          <Textarea
            id="descripcion"
            rows={4}
            maxLength={MAX_DESCRIPTION}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Somos 4 personas, llevamos dos días sin agua y hay un bebé."
          />
          <p className="text-right text-xs text-muted-foreground">
            {description.length}/{MAX_DESCRIPTION}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">¿Qué tan urgente es?</legend>
          <div className="grid grid-cols-3 gap-2">
            {URGENCIES.map((option) => {
              const selected = urgency === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setUrgency(option.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-transparent text-white"
                      : "border-border active:bg-muted",
                  )}
                  style={selected ? { backgroundColor: option.color } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">¿Dónde necesitas la ayuda?</span>
          <p className="text-xs text-muted-foreground">
            Mueve el mapa hasta que el pin quede en el sitio exacto.
          </p>

          {stillLocating ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <LocationPicker
              value={pinCoords}
              onChange={setCoords}
              gpsCoords={location.fix?.coords ?? null}
            />
          )}

          {location.error && (
            <p className="text-xs text-muted-foreground">
              {location.error} Puedes situar el pin a mano.
            </p>
          )}

          <Input
            aria-label="Referencia del sitio"
            value={addressLabel}
            onChange={(event) => setAddressLabel(event.target.value)}
            placeholder="Referencia: Cra. 13 con Calle 63, tercer piso"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Foto de la situación</span>
          <PhotoInput
            label="Añadir foto"
            hint="Opcional. Ayuda a entender qué hace falta."
            folder="posts"
            value={photoUrl}
            onChange={setPhotoUrl}
          />
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-sm font-semibold">Para que puedan contactarte</span>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input
              id="nombre"
              value={name}
              maxLength={60}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Luisa Mejía"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">Tu WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="300 123 4567"
            />
            <p className="text-xs text-muted-foreground">
              Será visible para quien abra tu solicitud. Es la única forma de que
              te escriban.
            </p>
          </div>

          <PhotoInput
            label="Añadir foto de perfil"
            hint="Opcional. Ayuda a que te reconozcan al llegar."
            folder="avatars"
            maxSide={512}
            shape="circle"
            value={avatarUrl}
            onChange={setAvatarUrl}
          />
        </div>

        <Button type="submit" disabled={submitting} className="h-13 text-base">
          {submitting ? (
            <>
              <Loader2 data-icon="inline-start" className="size-5! animate-spin" />
              Publicando…
            </>
          ) : (
            <>
              <Send data-icon="inline-start" className="size-5!" />
              Publicar solicitud
            </>
          )}
        </Button>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          Si es una emergencia inmediata, llama al{" "}
          <a href="tel:123" className="font-semibold text-foreground underline">
            123
          </a>
          .
        </p>
      </form>
    </main>
  );
}
