# Ayuda Ya · Sismo Colombia

PWA para ver **quién necesita ayuda cerca de mí** tras el sismo: quién es la
persona (nombre, foto de perfil), dónde está, qué necesita y una foto de lo que
pasó. El contacto se hace por WhatsApp.

La pantalla de entrada es el mapa. Nada de registro ni de onboarding: quien
necesita ayuda no está para crear una cuenta.

## Puesta en marcha

```bash
npm install
npm run dev
```

Arranca en <http://localhost:3000>. **Sin credenciales de Supabase la app
funciona en modo demo** con solicitudes de ejemplo trasladadas a tu ubicación,
marcadas con un aviso amarillo en pantalla. Sirve para trabajar la interfaz;
publicar de verdad requiere conectar la base de datos.

### Conectar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ejecutar `supabase/schema.sql` completo en el **SQL Editor**. Es idempotente:
   se puede volver a correr sin romper nada.
3. `cp .env.example .env.local` y rellenar `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Reiniciar `npm run dev`. El aviso amarillo desaparece.

## Cómo está armado

| Ruta / archivo | Qué hace |
| --- | --- |
| `src/app/page.tsx` | Landing: mapa a pantalla completa + hoja inferior con las solicitudes cercanas |
| `src/app/pedir/page.tsx` | Formulario de publicación — **pendiente**, hoy es un marcador de posición |
| `src/components/MapView.tsx` | MapLibre GL: marcadores con avatar, punto del usuario, vuelo a la ubicación |
| `src/lib/posts.ts` | Única puerta a los datos: listado, detalle, creación, cierre |
| `src/lib/geo.ts` | Geolocalización del navegador, distancias y formato en español |
| `supabase/schema.sql` | Tabla, índices geoespaciales, RLS y funciones RPC |
| `public/sw.js` | Service worker: shell y teselas en caché, datos siempre frescos |
| `scripts/generate-icons.mjs` | Genera los iconos PNG de la PWA (`npm run icons`) |

### Decisiones que conviene conocer

**Sin cuentas de usuario.** La propiedad de una publicación se prueba con un
`owner_token`: un UUID que el navegador guarda en `localStorage` y que permite
al autor cerrar su propia solicitud. Nadie tiene que registrarse para pedir
ayuda.

**La tabla no se toca directamente.** `posts` tiene RLS activo *sin políticas*,
así que `anon` no puede leerla ni escribirla. Todo pasa por cuatro funciones
`security definer` (`posts_nearby`, `post_detail`, `create_post`,
`resolve_post`) que controlan exactamente qué columnas salen.

**El WhatsApp no viaja en el listado.** `posts_nearby` no devuelve el teléfono;
sólo `post_detail`, de a una solicitud. No impide el scrapeo — cualquiera puede
recorrer los ids — pero lo encarece bastante frente a bajarse todos los números
de un tirón. Si el abuso aparece, el siguiente paso es rate limiting por IP en
un Edge Function.

**Los datos de solicitudes nunca se sirven de caché.** El service worker
cachea el shell y las teselas del mapa, pero deja pasar a la red todas las
peticiones a Supabase. Mostrar una solicitud ya resuelta como si fuera actual
manda a alguien a un sitio equivocado, y eso cuesta tiempo real.

**Las publicaciones caducan a los 7 días** (`expires_at`). Hay una función
`expire_old_posts()` lista para programar con `pg_cron`.

### Mapa

Teselas vectoriales de [OpenFreeMap](https://openfreemap.org): gratis, sin API
key y sin límite de uso. Si más adelante hace falta un SLA, se cambia el estilo
en `NEXT_PUBLIC_MAP_STYLE_URL` o en `src/lib/config.ts`.

La vista inicial es Colombia completa y vuela a la persona al conceder el
permiso de ubicación. **`DEFAULT_CENTER` en `src/lib/config.ts` debería
apuntar al epicentro** para que la primera pantalla ya sea útil incluso si
niegan la ubicación.

## Pendiente

- [ ] Formulario de `/pedir`: subida de avatar y foto a Supabase Storage,
      selección de ubicación arrastrable sobre el mapa
- [ ] Cerrar la propia solicitud desde la app (el RPC ya existe)
- [ ] Filtros por categoría y urgencia sobre el mapa
- [ ] Actualización en vivo con Supabase Realtime
- [ ] Moderación: reportar publicaciones falsas
- [ ] Rate limiting por IP en las escrituras
