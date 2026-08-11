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

### Datos de prueba

Con Supabase recién conectado la base está vacía y el mapa se ve igual que si
no hubiera nadie pidiendo ayuda. Para poblarla:

```bash
npm run seed:images   # sube los avatares y fotos al bucket `photos`
```

y después ejecutar `supabase/seed.sql` en el **SQL Editor**. Deja 25
solicitudes: 18 dentro del radio de 25 km, 5 repartidas por el país y 2 que
*no deben verse* (una resuelta y otra caducada) para comprobar que el filtrado
funciona. Cubre las nueve categorías, los tres niveles de urgencia,
descripciones al límite de los 500 caracteres, nombres de una sola palabra y de
59, y filas sin avatar, sin foto y sin dirección.

Es idempotente: borra su propia siembra y la vuelve a poner. Sólo toca filas
con `owner_token` que empiece por `seed:`, así que las publicaciones que hagas
probando la app sobreviven.

**Las imágenes tienen que subirse al bucket, no enlazarse de internet.**
`next.config.ts` sólo autoriza el host de Supabase Storage y `next/image`
lanza un error en tiempo de ejecución con cualquier otro. `seed-images.mjs`
las dibuja sin dependencias y las sube; usa la service role key si está en el
`.env` y si no la clave pública, que también sirve porque el bucket acepta
subidas anónimas a propósito.

**Dónde caen las solicitudes.** Las posiciones son distancia + rumbo desde un
centro configurable en el propio `seed.sql` (`center_lat` / `center_lng`), por
defecto Chapinero. El navegador te va a geolocalizar donde estés de verdad, así
que hay dos caminos: fingir la ubicación en Bogotá (DevTools → Sensors →
Location) o cambiar el centro del seed por tus coordenadas y volver a
ejecutarlo. Negar el permiso también sirve: `posts_nearby` sin lat/lng devuelve
lo más reciente del país entero.

**Ojo con el override de ubicación de DevTools: es pegajoso.** Se queda puesto
entre recargas y entre sesiones, y no hay nada en la página que lo delate — la
app recibe esa posición como si fuera real. Si el punto azul aparece en una
ciudad donde no estás, mira primero ahí (DevTools → Sensors → Location →
*No override*). Una posición emulada se reconoce porque dos lecturas seguidas
salen idénticas al sexto decimal; una real siempre baila un poco.

Y el permiso también se recuerda: una vez concedido, el navegador no vuelve a
preguntar. Para ver otra vez el diálogo hay que reiniciarlo en el candado de la
barra de direcciones.

Para probar el cierre de una solicitud, el token de cada fila es `seed:` más su
slug — `resolve_post(<id>, 'seed:rescate-cra13')`.

Limpiar sin volver a sembrar:

```sql
delete from public.posts where owner_token like 'seed:%';
```

## Cómo está armado

| Ruta / archivo | Qué hace |
| --- | --- |
| `src/app/page.tsx` | Landing: mapa a pantalla completa + hoja inferior con las solicitudes cercanas |
| `src/app/pedir/page.tsx` | Formulario de publicación — **pendiente**, hoy es un marcador de posición |
| `src/components/MapView.tsx` | MapLibre GL: marcadores con avatar, punto del usuario, vuelo a la ubicación |
| `src/components/NearbySheet.tsx` | Cajón inferior arrastrable, sobre el `Drawer` de shadcn (vaul) |
| `src/components/ui/` | Componentes de shadcn. Son nuestros: se editan sin miedo |
| `src/lib/models/` | El dominio: `Post`, `PostWithContact`, `NewPost`, `User`, `Coords` |
| `src/lib/posts.ts` | Única puerta a los datos de solicitudes: listado, detalle, creación, cierre |
| `src/lib/users.ts` | Perfil de quien tiene sesión iniciada |
| `src/lib/geo.ts` | Geolocalización del navegador y formato en español |
| `supabase/schema.sql` | Tabla, índices geoespaciales, RLS y funciones RPC |
| `supabase/seed.sql` | 25 solicitudes de prueba, idempotentes y recentrables |
| `public/sw.js` | Service worker: shell y teselas en caché, datos siempre frescos |
| `scripts/generate-icons.mjs` | Genera los iconos PNG de la PWA (`npm run icons`) |
| `scripts/seed-images.mjs` | Dibuja y sube las imágenes del seed (`npm run seed:images`) |
| `scripts/png.mjs` | Codificador PNG mínimo que comparten los dos scripts |

### Decisiones que conviene conocer

**Los modelos son clases inmutables.** `Post`, `PostWithContact`, `NewPost`,
`User` y `Coords` viven en `src/lib/models/`. Todos los campos son `readonly`
y cualquier cambio devuelve una instancia nueva (`with`, `withDistanceFrom`),
que es lo que React necesita para detectar el cambio.

> **Cuidado con los Server Components.** Next.js sólo serializa objetos planos
> al pasar props de servidor a cliente: una instancia de clase revienta ese
> límite. Hoy no afecta porque toda la app es `"use client"`, pero si `/pedir`
> o cualquier pantalla futura se renderiza en servidor, hay que pasar la fila
> cruda e hidratar con `Post.fromRow()` dentro del componente cliente.

**Registrarse es opcional.** `Post.userId` puede ser null. La propiedad de una
publicación se prueba de dos formas: el `owner_token` (un UUID que el navegador
guarda en `localStorage`) o la sesión de la cuenta dueña. Quien está bajo un
escombro no crea una cuenta; quien sí la tiene puede cerrar su solicitud desde
otro teléfono.

**El nombre y el teléfono se copian en cada publicación** aunque haya cuenta
detrás. Es una foto fija del momento de publicar: así la solicitud sigue siendo
contactable aunque su autor borre la cuenta.

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

**La ubicación se escucha, no se lee una vez.** `watchLocation()` usa
`watchPosition` y se queda con la lectura más precisa, porque la primera que
entrega el navegador suele venir de la IP o de la antena y puede estar a
kilómetros. Para al bajar de ±50 m o a los 20 segundos, lo que ocurra antes.
Nada de `maximumAge`: una posición cacheada de hace un minuto puede ser de otro
barrio, y aquí eso manda a alguien a la dirección equivocada.

**La precisión decide el encuadre.** El zoom al aterrizar no es fijo: se
encuadra el círculo de incertidumbre, acotado entre `LOCATED_MIN_ZOOM` y
`LOCATED_MAX_ZOOM`. Con ±20 m se llega a la calle; con ±5 km el mapa se queda
lejos a propósito y sale el aviso de "ubicación aproximada". Acercarse a una
esquina concreta cuando el error es de kilómetros es mentir con el encuadre, y
las distancias de las tarjetas heredan ese error. El halo azul alrededor del
punto es ese mismo radio a escala.

El mapa deja de seguir al GPS en cuanto la persona arrastra o hace zoom: estar
explorando y que la vista te devuelva a tu casa es insufrible.

### Interfaz

[shadcn/ui](https://ui.shadcn.com) sobre Tailwind v4 (preset `radix-nova`,
base `radix-ui`, iconos `lucide-react`). Los componentes viven en
`src/components/ui/` y **son código nuestro**: la librería los copia al repo,
no se instalan como dependencia. Editarlos es el uso previsto, no un parche.

**Todos los iconos son de Lucide.** No hay emoji ni dibujos propios: los emoji
los pintaba cada sistema operativo a su manera y a tamaño de pin varios eran
indistinguibles. Cada categoría declara su icono en `src/lib/categories.ts`
(`icon: LucideIcon`), y hasta los iconos PNG de la PWA salen del mismo trazo —
`npm run icons` rasteriza `HandHeart` con `sharp` en vez de dibujar formas a
mano.

La única excepción es el punto azul de "estás aquí": un disco liso es la
convención de todos los mapas y cualquier glifo dentro se confundiría con una
solicitud. (`scripts/seed-images.mjs` sigue generando imágenes, pero son fotos
y avatares de prueba, no iconos.)

Para que los pines pudieran usar iconos de React, `MapView` dejó de construir
su DOM a mano: ahora crea un `div` vacío por solicitud y le inyecta el
contenido con `createPortal`. Los contenedores se crean **durante el render**
—no en un efecto— porque un portal montado después no llega a renderizarse
nunca; viven en `useState` con inicializador perezoso, ya que leer un `useRef`
en el render infringe `react-hooks/refs`.

No hay dos sistemas de color. La paleta de la app está escrita con los nombres
semánticos de shadcn (`--background`, `--muted-foreground`, `--destructive`…)
en `globals.css`, así que los componentes de la librería y los propios se ven
igual. `primary` es el verde de marca; `destructive`, el rojo de urgencia.

Modo oscuro por `prefers-color-scheme`, no por clase `.dark`: no hay selector
de tema. Por eso `globals.css` **no** redefine `@custom-variant dark`, para
conservar la variante nativa de Tailwind.

Dos cosas que costaron y conviene no repetir:

- **`DrawerContent` pintaba un velo sobre el mapa.** Se le añadió una prop
  `overlay` (por defecto `true`) para poder apagarlo en el cajón permanente.
- **vaul asume que el contenido mide una pantalla completa** al colocarlo con
  `translateY(alto × (1 − snap))`. Con la altura automática de shadcn el panel
  se iba entero por debajo del borde. Además, `mt-24` y `max-h-[80vh]` vienen
  detrás del variante `data-[vaul-drawer-direction=bottom]:`, así que anularlos
  exige repetir ese prefijo: sin él tailwind-merge no los considera la misma
  regla y la original sigue ganando.

### Mapa

Teselas vectoriales de [OpenFreeMap](https://openfreemap.org): gratis, sin API
key y sin límite de uso. Si más adelante hace falta un SLA, se cambia el estilo
en `NEXT_PUBLIC_MAP_STYLE_URL` o en `src/lib/config.ts`.

La vista inicial es Colombia completa y vuela a la persona al conceder el
permiso de ubicación. **`DEFAULT_CENTER` en `src/lib/config.ts` debería
apuntar al epicentro** para que la primera pantalla ya sea útil incluso si
niegan la ubicación.

## Pendiente

- [ ] **Registro e inicio de sesión.** El modelo `User`, la tabla y las
      políticas ya están; falta el flujo de Supabase Auth y las pantallas de
      perfil. Hasta entonces la app es anónima de punta a punta y `user_id`
      siempre queda en null.
- [ ] Formulario de `/pedir`: subida de avatar y foto a Supabase Storage,
      selección de ubicación arrastrable sobre el mapa
- [ ] Cerrar la propia solicitud desde la app (el RPC ya existe)
- [ ] Filtros por categoría y urgencia sobre el mapa
- [ ] Actualización en vivo con Supabase Realtime
- [ ] Moderación: reportar publicaciones falsas
- [ ] Rate limiting por IP en las escrituras

## Problemas conocidos

**Avisos del estilo del mapa.** OpenFreeMap Liberty trae tres capas de
escudos de carretera de EE. UU. cuyo filtro compara contra `null`, y MapLibre
lo avisa por consola (`Expected value to be of type number, but found null`).
Es del estilo, no del código, y en Colombia esas capas no pintan nada. Es lo
que hace aparecer «1 Issue» en el indicador de desarrollo de Next.

**El worker de MapLibre necesita URL fija.** Turbopack no puede resolver
`new URL(ternario, import.meta.url)`, así que el worker recibía la URL del
módulo principal y la capa vectorial nunca cargaba — sin errores visibles,
porque el fallo ocurría dentro del worker. Se resuelve copiándolo a
`public/maplibre/` y apuntándolo con `setWorkerUrl()` en `MapView.tsx`. Si al
actualizar maplibre-gl el mapa se queda sólo con el relieve, mirar ahí primero.
