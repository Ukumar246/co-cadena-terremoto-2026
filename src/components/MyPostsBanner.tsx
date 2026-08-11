"use client";

import { useEffect, useState } from "react";
import { CircleCheckBig, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategory } from "@/lib/categories";
import { formatAge } from "@/lib/geo";
import { peekOwnerToken } from "@/lib/owner-token";
import { deletePost, fetchMyPosts, resolvePost, type OwnPost } from "@/lib/posts";

interface MyPostsBannerProps {
  /** Se llama al cerrar o borrar, para que el mapa deje de mostrarla. */
  onChanged: () => void;
}

/** Días que le quedan a una solicitud antes de retirarse sola. */
function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Aviso para quien publicó: sus solicitudes siguen abiertas, y desde aquí las
 * cierra.
 *
 * Sólo lo ve el dispositivo que publicó — la prueba es el `owner_token` de
 * `localStorage`, el mismo que exige la RPC. Nadie más ve este bloque, así que
 * tampoco hay nada que ocultar en él.
 *
 * Importa que exista: una solicitud resuelta que sigue en el mapa manda gente
 * a un sitio donde ya no hace falta nadie, y esa persona deja de estar
 * disponible para quien sí la necesita.
 */
export function MyPostsBanner({ onChanged }: MyPostsBannerProps) {
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El token vive en localStorage, así que sólo existe en el navegador: se
  // lee en un efecto y no en el render para no romper la hidratación.
  useEffect(() => {
    let cancelled = false;
    fetchMyPosts(peekOwnerToken())
      .then((mine) => {
        if (!cancelled) setPosts(mine);
      })
      .catch(() => {
        // Sin aviso no se pierde nada: el mapa sigue funcionando igual.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function act(post: OwnPost, action: "resolve" | "delete") {
    const token = peekOwnerToken();
    if (!token) return;

    setBusyId(post.id);
    setError(null);
    try {
      const done =
        action === "resolve"
          ? await resolvePost(post.id, token)
          : await deletePost(post.id, token);

      if (!done) {
        setError("No pudimos actualizar tu solicitud. Vuelve a intentarlo.");
        return;
      }
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setConfirmingId(null);
      onChanged();
    } catch {
      setError("No pudimos actualizar tu solicitud. Revisa tu conexión.");
    } finally {
      setBusyId(null);
    }
  }

  if (posts.length === 0) return null;

  return (
    <Card
      size="sm"
      className="pointer-events-auto gap-2 bg-card/95 px-3 backdrop-blur"
    >
      <p className="text-xs font-semibold">
        {posts.length === 1
          ? "Tu solicitud sigue abierta"
          : `Tienes ${posts.length} solicitudes abiertas`}
      </p>

      {posts.map((post) => {
        const category = getCategory(post.category);
        const Icon = category.icon;
        const busy = busyId === post.id;
        const confirming = confirmingId === post.id;
        const left = daysLeft(post.expiresAt);

        return (
          <div key={post.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Icon
                className="size-4 shrink-0"
                style={{ color: category.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {category.label} · {formatAge(post.createdAt)}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {left <= 1 ? "caduca hoy" : `${left} d`}
              </span>
            </div>

            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[11px] text-muted-foreground">
                  ¿Borrarla del todo?
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setConfirmingId(null)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 bg-destructive px-2 text-[11px] text-white hover:bg-destructive/90"
                  onClick={() => act(post, "delete")}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : "Sí, borrar"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-[11px]"
                  onClick={() => act(post, "resolve")}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CircleCheckBig data-icon="inline-start" />
                  )}
                  Ya me ayudaron
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Borrar la solicitud"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={() => setConfirmingId(post.id)}
                  disabled={busy}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </Card>
  );
}
