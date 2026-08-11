"use client";

import { AtSign, Link as LinkIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STORY_PLATFORMS, detectPlatform, getPlatform } from "@/lib/social";
import type { SocialPlatform } from "@/lib/models";
import { cn } from "@/lib/utils";

export type SocialMode = "link" | "story";

export interface SocialProofValue {
  mode: SocialMode;
  url: string;
  handle: string;
  platform: SocialPlatform;
}

export const EMPTY_SOCIAL_PROOF: SocialProofValue = {
  mode: "link",
  url: "",
  handle: "",
  platform: "instagram",
};

interface SocialProofInputProps {
  value: SocialProofValue;
  onChange: (value: SocialProofValue) => void;
}

/**
 * El respaldo en redes de la solicitud, en una de dos formas.
 *
 * Las historias de Instagram y Facebook caducan a las 24 h y su URL deja de
 * servirle a cualquiera que llegue después, así que en ese caso no se pide un
 * enlace —sería basura en un día— sino el perfil donde buscar.
 */
export function SocialProofInput({ value, onChange }: SocialProofInputProps) {
  const set = (changes: Partial<SocialProofValue>) =>
    onChange({ ...value, ...changes });

  const detected = value.url ? getPlatform(detectPlatform(value.url)) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="group">
        {(
          [
            { id: "link", label: "Tengo el enlace", icon: LinkIcon },
            { id: "story", label: "Es una historia", icon: AtSign },
          ] as const
        ).map((option) => {
          const Icon = option.icon;
          const selected = value.mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => set({ mode: option.id })}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground active:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      {value.mode === "link" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="social-url">Enlace a tu publicación</Label>
          <Input
            id="social-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={value.url}
            onChange={(event) => set({ url: event.target.value })}
            placeholder="instagram.com/p/CxYz..."
          />
          <p className="text-xs text-muted-foreground">
            {detected && detected.id !== "otra"
              ? `Detectamos ${detected.label}.`
              : "Pega el enlace desde la app: «Copiar enlace» en la publicación."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">¿Dónde la publicaste?</span>
            <div className="grid grid-cols-3 gap-2">
              {STORY_PLATFORMS.map((platform) => {
                const selected = value.platform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set({ platform: platform.id })}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground active:bg-muted",
                    )}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="social-handle">Tu usuario</Label>
            <div className="relative">
              <AtSign
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="social-handle"
                className="pl-9"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={value.handle}
                onChange={(event) => set({ handle: event.target.value })}
                placeholder="tunombre"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Las historias desaparecen a las 24 h, por eso pedimos tu perfil y
              no el enlace: así te pueden buscar aunque ya haya caducado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
