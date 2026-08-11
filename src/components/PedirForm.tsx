"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  Loader2,
  Send,
  TriangleAlert,
} from "lucide-react";

import { LocationPicker } from "./LocationPicker";
import { PhotoInput } from "./PhotoInput";
import {
  EMPTY_SOCIAL_PROOF,
  SocialProofInput,
  type SocialProofValue,
} from "./SocialProofInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, URGENCIES } from "@/lib/categories";
import { DEFAULT_CENTER } from "@/lib/config";
import { watchLocation, type LocationState } from "@/lib/geo";
import {
  Coords,
  NewPost,
  detectPlatform,
  type NewPostField,
  type PostCategory,
  type Urgency,
} from "@/lib/models";
import { getOwnerToken } from "@/lib/owner-token";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const LOCATING: LocationState = { fix: null, status: "locating", error: null };
const FALLBACK_CENTER = new Coords(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
const MAX_DESCRIPTION = 500;

/**
 * Qué campos valida cada paso. Las reglas viven en `NewPost.validate()`; aquí
 * sólo se dice cuáles corresponden a cada pantalla, para no tener dos copias
 * de los mismos límites.
 */
const STEPS: { title: string; hint: string; fields: readonly NewPostField[] }[] = [
  {
    title: "Muestra lo que está pasando",
    hint: "Una foto y tu publicación en redes. Es lo que hace creíble el resto.",
    fields: ["photo", "social"],
  },
  {
    title: "Qué necesitas",
    hint: "Con esto se decide quién puede echarte una mano.",
    fields: ["category", "description"],
  },
  {
    title: "Dónde estás y cómo contactarte",
    hint: "Lo último, y ya queda publicada.",
    fields: ["coords", "name", "whatsapp"],
  },
];

export function PedirForm() {
  const [step, setStep] = useState(0);

  const [location, setLocation] = useState<LocationState>(LOCATING);
  const [coords, setCoords] = useState<Coords | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [social, setSocial] = useState<SocialProofValue>(EMPTY_SOCIAL_PROOF);
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [addressLabel, setAddressLabel] = useState("");
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

  /**
   * El borrador se arma en cada render con lo que haya. `photoUrl` es
   * obligatorio en el modelo, así que hasta el paso 1 se pasa cadena vacía y
   * es `validate()` quien lo señala — no un `!` que engañe al compilador.
   */
  const draft = new NewPost({
    name,
    avatarUrl,
    whatsapp,
    category: category ?? ("" as PostCategory),
    description,
    coords: pinCoords,
    addressLabel: addressLabel.trim() || null,
    photoUrl: photoUrl ?? "",
    // Sólo viaja la forma elegida: si se escribió un enlace y luego se cambió
    // a historia, el enlace no se envía a medias.
    socialUrl: social.mode === "link" ? social.url.trim() || null : null,
    socialHandle: social.mode === "story" ? social.handle.trim() || null : null,
    socialPlatform:
      social.mode === "story"
        ? social.platform
        : social.url.trim()
          ? detectPlatform(social.url.trim())
          : null,
    urgency,
  });

  function goTo(next: number) {
    setStep(next);
    setProblems([]);
    window.scrollTo({ top: 0 });
  }

  function handleNext() {
    const found = draft.problemsIn(STEPS[step].fields);
    if (found.length > 0) {
      setProblems(found.map((problem) => problem.message));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goTo(step + 1);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found = draft.validate();
    if (found.length > 0) {
      setProblems(found.map((problem) => problem.message));
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

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {step === 0 ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground"
            >
              <Link href="/">
                <ArrowLeft data-icon="inline-start" />
                Volver al mapa
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground"
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeft data-icon="inline-start" />
              Atrás
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            Paso {step + 1} de {STEPS.length}
          </span>
        </div>

        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />

        <div>
          <h1 className="text-2xl font-semibold">{current.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
        </div>
      </div>

      {problems.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Falta algo para continuar</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(event) => {
          if (isLastStep) return handleSubmit(event);
          event.preventDefault();
          handleNext();
        }}
        className="flex flex-1 flex-col gap-6"
      >
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <PhotoInput
              label="Tomar o elegir foto"
              hint="Se sube ahora, mientras rellenas el resto."
              folder="posts"
              value={photoUrl}
              onChange={setPhotoUrl}
              shape="tall"
            />
            <p className="text-sm text-muted-foreground">
              Una foto explica en un segundo lo que un párrafo no logra, y le da
              a quien va a moverse una idea de qué llevar. Si no puedes tomar
              una ahora, llama al{" "}
              <a href="tel:123" className="font-semibold text-foreground underline">
                123
              </a>
              .
            </p>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-semibold">
                Tu publicación en redes
              </span>
              <p className="mb-1 text-xs text-muted-foreground">
                Quien vaya a ayudarte no te conoce. Poder ver que lo contaste
                también en tu perfil es lo que convierte un mensaje suelto en
                algo que alguien se atreve a atender.
              </p>
              <SocialProofInput value={social} onChange={setSocial} />
            </div>
          </div>
        )}

        {step === 1 && (
          <>
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
              <legend className="mb-2 text-sm font-semibold">
                ¿Qué tan urgente es?
              </legend>
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
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                ¿Dónde necesitas la ayuda?
              </span>
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

            <div className="flex flex-col gap-4">
              <span className="text-sm font-semibold">
                Para que puedan contactarte
              </span>

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
                  Será visible para quien abra tu solicitud. Es la única forma de
                  que te escriban.
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
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={submitting} className="h-13 text-base">
            {submitting ? (
              <>
                <Loader2 data-icon="inline-start" className="size-5! animate-spin" />
                Publicando…
              </>
            ) : isLastStep ? (
              <>
                <Send data-icon="inline-start" className="size-5!" />
                Publicar solicitud
              </>
            ) : (
              <>
                Continuar
                <ArrowRight data-icon="inline-end" className="size-5!" />
              </>
            )}
          </Button>

          {isLastStep && (
            <p className="pb-2 text-center text-xs text-muted-foreground">
              Si es una emergencia inmediata, llama al{" "}
              <a href="tel:123" className="font-semibold text-foreground underline">
                123
              </a>
              .
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
