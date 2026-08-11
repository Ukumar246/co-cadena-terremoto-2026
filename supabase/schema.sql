-- ============================================================================
--  Esquema de la app de ayuda mutua (sismo Colombia)
--  Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
--  Decisiones de fondo:
--   * Sin cuentas de usuario. Quien está bajo un escombro no crea una cuenta.
--     La propiedad de una publicación se prueba con `owner_token`, un UUID que
--     el navegador guarda en localStorage.
--   * La tabla NO es accesible directamente por `anon`: RLS activo sin
--     políticas. Todo pasa por funciones RPC que controlan qué columnas salen.
--   * `whatsapp` no se devuelve en el listado del mapa, sólo en `post_detail`.
--     No impide el scrapeo, pero lo encarece bastante.
-- ============================================================================

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Usuarios: el perfil público de quien tiene cuenta.
--
-- Ojo con el nombre: `public.users` NO es `auth.users`. Supabase es dueño de
-- `auth.users` (correo, contraseña, sesiones) y esta tabla sólo cuelga de ella
-- con el mismo uuid. Aquí no se duplica el correo: sería una responsabilidad
-- de privacidad sin ningún uso hoy.
--
-- Tener cuenta NO es requisito para pedir ayuda. Sirve para no reescribir tus
-- datos cada vez, para cerrar tus solicitudes desde cualquier dispositivo y
-- para poder verificar a quien ayuda de forma organizada.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  name        text not null,
  avatar_url  text,
  -- Puede faltar: alguien se registra por correo y añade el número después.
  whatsapp    text,
  -- Lo mueve una persona del equipo (alcaldía, brigada, ONG). No es
  -- "confirmó su correo".
  verified_at timestamptz,

  constraint users_name_len check (char_length(name) between 2 and 60),
  constraint users_whatsapp_len check (
    whatsapp is null or char_length(whatsapp) between 7 and 20
  )
);

-- ---------------------------------------------------------------------------
-- Solicitudes de ayuda
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Quién. El nombre, el avatar y el teléfono se guardan en la propia
  -- publicación aunque haya `user_id`: son una foto fija del momento de
  -- publicar. Así la solicitud sigue siendo contactable aunque su autor borre
  -- la cuenta, y quien publica sin registrarse no necesita a nadie detrás.
  user_id       uuid references public.users(id) on delete set null,
  name          text not null,
  avatar_url    text,
  whatsapp      text not null,

  -- Qué necesita
  category      text not null,
  description   text not null,
  urgency       text not null default 'media',

  -- Dónde
  lat           double precision not null,
  lng           double precision not null,
  address_label text,
  location      extensions.geography(Point, 4326)
                generated always as (
                  extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                ) stored,

  -- Qué pasó
  photo_url     text,

  -- Ciclo de vida
  status        text not null default 'active',
  owner_token   text not null,
  expires_at    timestamptz not null default now() + interval '7 days',

  constraint posts_category_valid check (category in (
    'rescate','salud','agua','comida','refugio','ropa','transporte','comunicacion','otro'
  )),
  constraint posts_urgency_valid check (urgency in ('alta','media','baja')),
  constraint posts_status_valid check (status in ('active','resolved','expired')),
  constraint posts_lat_range check (lat between -90 and 90),
  constraint posts_lng_range check (lng between -180 and 180),
  constraint posts_name_len check (char_length(name) between 2 and 60),
  constraint posts_description_len check (char_length(description) between 5 and 500),
  constraint posts_whatsapp_len check (char_length(whatsapp) between 7 and 20)
);

create index if not exists posts_location_idx on public.posts using gist (location);
create index if not exists posts_active_idx on public.posts (created_at desc)
  where status = 'active';
create index if not exists posts_owner_idx on public.posts (owner_token);
create index if not exists posts_user_idx on public.posts (user_id)
  where user_id is not null;

-- Migración desde el esquema anterior (sin usuarios).
alter table public.posts
  add column if not exists user_id uuid references public.users(id) on delete set null;

-- `updated_at` automático
-- `search_path` fijo: sin él, el rol que dispare el trigger decide qué `now()`
-- se acaba ejecutando. Es lo que marca el linter de Supabase como WARN.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- Al registrarse en `auth.users` se crea el perfil. El nombre sale de los
-- metadatos del registro; si no viene ninguno, se usa un marcador que la
-- persona puede cambiar después. `whatsapp` puede quedar vacío a propósito:
-- exigirlo aquí haría fallar el alta entera.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, avatar_url, whatsapp)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'Sin nombre'),
    new.raw_user_meta_data ->> 'avatar_url',
    nullif(btrim(new.raw_user_meta_data ->> 'whatsapp'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- RLS
--
-- `posts`: nadie toca la tabla directamente. Sin políticas, RLS deniega todo a
-- anon y authenticated; todo pasa por las funciones RPC de abajo.
--
-- `users`: sí tiene políticas, pero sólo sobre la propia fila. El perfil de
-- otra persona no es consultable — el mapa ya lleva el nombre y el avatar
-- copiados en cada publicación, así que nadie necesita leer esta tabla para
-- pintar la pantalla principal.
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;

alter table public.users enable row level security;

drop policy if exists "cada quien lee su perfil" on public.users;
create policy "cada quien lee su perfil"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "cada quien edita su perfil" on public.users;
create policy "cada quien edita su perfil"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Las políticas de RLS operan por fila, no por columna: sin esto, la política
-- de arriba dejaría que cualquiera se pusiera `verified_at` a sí mismo. El
-- permiso de escritura se acota a las tres columnas que son suyas.
revoke insert, update, delete on public.users from anon, authenticated;
grant update (name, avatar_url, whatsapp) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- Lectura: solicitudes activas cerca de un punto. SIN teléfono.
-- Si no se pasa lat/lng, devuelve las más recientes del país.
-- ---------------------------------------------------------------------------
-- `create or replace` no puede cambiar el tipo de retorno, y estas funciones
-- ganaron la columna `user_id`. Se tiran primero para que el script siga
-- siendo re-ejecutable sobre una base con el esquema anterior.
drop function if exists public.posts_nearby(double precision, double precision, integer, integer);
drop function if exists public.post_detail(uuid);

create or replace function public.posts_nearby(
  in_lat      double precision default null,
  in_lng      double precision default null,
  in_radius_m integer default 25000,
  in_limit    integer default 200
)
returns table (
  id            uuid,
  created_at    timestamptz,
  user_id       uuid,
  name          text,
  avatar_url    text,
  category      text,
  description   text,
  lat           double precision,
  lng           double precision,
  address_label text,
  photo_url     text,
  urgency       text,
  status        text,
  distance_m    double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (
    select case
      when in_lat is null or in_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(in_lng, in_lat), 4326)::extensions.geography
    end as g
  )
  select
    p.id, p.created_at, p.user_id, p.name, p.avatar_url, p.category, p.description,
    p.lat, p.lng, p.address_label, p.photo_url, p.urgency, p.status,
    case when o.g is null then null
         else extensions.st_distance(p.location, o.g) end as distance_m
  from public.posts p cross join origin o
  where p.status = 'active'
    and p.expires_at > now()
    and (o.g is null or extensions.st_dwithin(p.location, o.g, greatest(in_radius_m, 100)))
  order by
    case p.urgency when 'alta' then 0 when 'media' then 1 else 2 end,
    case when o.g is null then null
         else extensions.st_distance(p.location, o.g) end asc nulls last,
    p.created_at desc
  limit least(coalesce(in_limit, 200), 500);
$$;

-- ---------------------------------------------------------------------------
-- Detalle: una sola solicitud, ésta sí con el WhatsApp.
-- ---------------------------------------------------------------------------
create or replace function public.post_detail(in_id uuid)
returns table (
  id            uuid,
  created_at    timestamptz,
  user_id       uuid,
  name          text,
  avatar_url    text,
  whatsapp      text,
  category      text,
  description   text,
  lat           double precision,
  lng           double precision,
  address_label text,
  photo_url     text,
  urgency       text,
  status        text,
  distance_m    double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id, p.created_at, p.user_id, p.name, p.avatar_url, p.whatsapp, p.category,
    p.description,
    p.lat, p.lng, p.address_label, p.photo_url, p.urgency, p.status,
    null::double precision as distance_m
  from public.posts p
  where p.id = in_id
    and p.status = 'active'
    and p.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Escritura: publicar una solicitud.
-- ---------------------------------------------------------------------------
create or replace function public.create_post(
  in_name          text,
  in_whatsapp      text,
  in_category      text,
  in_description   text,
  in_lat           double precision,
  in_lng           double precision,
  in_owner_token   text,
  in_avatar_url    text default null,
  in_address_label text default null,
  in_photo_url     text default null,
  in_urgency       text default 'media'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  new_id       uuid;
  recent_count integer;
  v_user_id    uuid := auth.uid();
  v_profile    public.users%rowtype;
  v_name       text;
  v_whatsapp   text;
  v_avatar_url text;
begin
  if char_length(coalesce(in_owner_token, '')) < 16 then
    raise exception 'owner_token inválido';
  end if;

  -- Freno anti-spam por dispositivo: 5 publicaciones por hora.
  select count(*) into recent_count
  from public.posts
  where owner_token = in_owner_token
    and created_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Has publicado demasiadas solicitudes seguidas. Espera un momento.';
  end if;

  -- La cuenta sale de `auth.uid()`, nunca de un argumento: es el único dato de
  -- sesión que el cliente no puede inventarse. Si hay perfil, sus datos rellenan
  -- los huecos que el formulario dejó vacíos.
  if v_user_id is not null then
    select * into v_profile from public.users where id = v_user_id;
  end if;

  v_name       := coalesce(nullif(btrim(coalesce(in_name, '')), ''), v_profile.name);
  v_whatsapp   := coalesce(nullif(btrim(coalesce(in_whatsapp, '')), ''), v_profile.whatsapp);
  v_avatar_url := coalesce(in_avatar_url, v_profile.avatar_url);

  if v_whatsapp is null then
    raise exception 'Hace falta un número de WhatsApp para que puedan contactarte.';
  end if;

  insert into public.posts (
    user_id, name, avatar_url, whatsapp, category, description,
    lat, lng, address_label, photo_url, urgency, owner_token
  ) values (
    v_user_id, v_name, v_avatar_url, v_whatsapp, in_category, btrim(in_description),
    in_lat, in_lng, nullif(btrim(coalesce(in_address_label, '')), ''), in_photo_url,
    coalesce(in_urgency, 'media'), in_owner_token
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cerrar una solicitud propia (ya me ayudaron).
--
-- Vale cualquiera de las dos pruebas de propiedad: el token del dispositivo
-- que la publicó, o la sesión de la cuenta dueña. Lo segundo es justamente lo
-- que gana quien se registra: poder cerrar su solicitud desde otro teléfono
-- cuando el suyo se quedó sin batería.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_post(in_id uuid, in_owner_token text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  affected integer;
begin
  update public.posts
     set status = 'resolved'
   where id = in_id
     and status = 'active'
     and (
       owner_token = in_owner_token
       or (auth.uid() is not null and user_id = auth.uid())
     );

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: anon sólo puede ejecutar estas cuatro funciones.
--
-- OJO: `revoke ... from public` NO basta en Supabase. Los DEFAULT PRIVILEGES
-- del esquema `public` conceden EXECUTE explícitamente a `anon` y
-- `authenticated` sobre cada función nueva, así que hay que revocarles a ellos
-- por nombre o quedan publicadas en /rest/v1/rpc sin quererlo.
-- ---------------------------------------------------------------------------
revoke all on function public.posts_nearby(double precision, double precision, integer, integer) from public, anon, authenticated;
revoke all on function public.post_detail(uuid) from public, anon, authenticated;
revoke all on function public.create_post(text, text, text, text, double precision, double precision, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.resolve_post(uuid, text) from public, anon, authenticated;

-- Internas: mantenimiento y triggers. No son API pública.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

grant execute on function public.posts_nearby(double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.post_detail(uuid) to anon, authenticated;
grant execute on function public.create_post(text, text, text, text, double precision, double precision, text, text, text, text, text) to anon, authenticated;
grant execute on function public.resolve_post(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: fotos y avatares. Lectura pública, subida anónima.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos son públicas" on storage.objects;
create policy "photos son públicas"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "cualquiera puede subir a photos" on storage.objects;
create policy "cualquiera puede subir a photos"
  on storage.objects for insert
  with check (bucket_id = 'photos');

-- ---------------------------------------------------------------------------
-- Mantenimiento: marcar como vencidas las solicitudes viejas.
-- Programar con pg_cron si está disponible:
--   select cron.schedule('expire-posts', '0 * * * *', $$select public.expire_old_posts()$$);
-- ---------------------------------------------------------------------------
create or replace function public.expire_old_posts()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.posts
     set status = 'expired'
   where status = 'active'
     and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_old_posts() from public, anon, authenticated;
