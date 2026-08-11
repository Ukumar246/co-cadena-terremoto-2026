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
-- Tabla
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Quién
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

-- `updated_at` automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
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

-- ---------------------------------------------------------------------------
-- RLS: nadie toca la tabla directamente. Sólo las funciones de abajo.
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;
-- (a propósito no se crea ninguna política: sin políticas, RLS deniega todo
--  a anon y authenticated. La service_role sigue pasando por encima.)

-- ---------------------------------------------------------------------------
-- Lectura: solicitudes activas cerca de un punto. SIN teléfono.
-- Si no se pasa lat/lng, devuelve las más recientes del país.
-- ---------------------------------------------------------------------------
create or replace function public.posts_nearby(
  in_lat      double precision default null,
  in_lng      double precision default null,
  in_radius_m integer default 25000,
  in_limit    integer default 200
)
returns table (
  id            uuid,
  created_at    timestamptz,
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
    p.id, p.created_at, p.name, p.avatar_url, p.category, p.description,
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
    p.id, p.created_at, p.name, p.avatar_url, p.whatsapp, p.category, p.description,
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
  new_id uuid;
  recent_count integer;
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

  insert into public.posts (
    name, avatar_url, whatsapp, category, description,
    lat, lng, address_label, photo_url, urgency, owner_token
  ) values (
    btrim(in_name), in_avatar_url, btrim(in_whatsapp), in_category, btrim(in_description),
    in_lat, in_lng, nullif(btrim(coalesce(in_address_label, '')), ''), in_photo_url,
    coalesce(in_urgency, 'media'), in_owner_token
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cerrar una solicitud propia (ya me ayudaron).
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
     and owner_token = in_owner_token
     and status = 'active';

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: anon sólo puede ejecutar estas cuatro funciones.
-- ---------------------------------------------------------------------------
revoke all on function public.posts_nearby(double precision, double precision, integer, integer) from public;
revoke all on function public.post_detail(uuid) from public;
revoke all on function public.create_post(text, text, text, text, double precision, double precision, text, text, text, text, text) from public;
revoke all on function public.resolve_post(uuid, text) from public;

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

revoke all on function public.expire_old_posts() from public;
