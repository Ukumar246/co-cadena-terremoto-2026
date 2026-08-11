-- ============================================================================
--  Datos de prueba para desarrollo local
--
--  Ejecutar DESPUÉS de `schema.sql`, en el SQL Editor de Supabase.
--  Es idempotente: borra su propia siembra y la vuelve a poner, así que se
--  puede correr las veces que haga falta.
--
--  Antes conviene subir las imágenes:
--      npm run seed:images
--  Sin ellas los avatares y las fotos dan 404. `next/image` sólo acepta el
--  host de Supabase Storage (ver `next.config.ts`), por eso las imágenes de
--  prueba se suben al bucket en vez de enlazar a un servicio de internet.
--
--  NADA de esto toca `public.users`: el registro todavía no existe en la app,
--  así que las 25 solicitudes son anónimas y `user_id` queda en null, igual
--  que lo que produce hoy el formulario.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Limpieza. Todas las filas sembradas llevan `owner_token` con prefijo
-- `seed:`, que es lo que las distingue de una publicación de verdad hecha
-- desde la app mientras se prueba.
-- ---------------------------------------------------------------------------
delete from public.posts where owner_token like 'seed:%';

-- ---------------------------------------------------------------------------
-- Siembra
--
-- Las posiciones NO son coordenadas absolutas sino distancia + rumbo desde un
-- centro configurable. Así "a 22 km" sigue siendo 22 km de verdad aunque se
-- mueva el centro, que es lo único que importa para probar el radio de
-- búsqueda. Al cambiar `center_lat`/`center_lng` las etiquetas de dirección
-- dejan de coincidir con el barrio real — son decorado, no datos.
-- ---------------------------------------------------------------------------
with config as (
  select
    -- Cali, El Peñón. Mismo centro que `DEFAULT_CENTER` en `src/lib/config.ts`.
    3.4516::double precision   as center_lat,
    -76.532::double precision  as center_lng,
    -- URL pública del bucket. Es el mismo host que ya viaja en el bundle del
    -- cliente (`NEXT_PUBLIC_SUPABASE_URL`), no es un secreto.
    'https://gcsboxskjveiuqclzvgc.supabase.co/storage/v1/object/public/photos/seed/'::text
      as photos_base
),

-- slug          identifica la fila; el owner_token es 'seed:' || slug
-- dist_m        metros desde el centro
-- bearing_deg   0 = norte, 90 = este
-- avatar_n      1..6 o null (null = el componente pinta las iniciales)
-- photo_n       1..4 o null
-- age_min       antigüedad en minutos (mueve el "hace X" de la tarjeta)
-- ttl_days      días de vida desde created_at (7 = lo normal)
seed(slug, dist_m, bearing_deg, name, whatsapp, category, urgency,
     description, address_label, avatar_n, photo_n, age_min, status, ttl_days) as (values

  -- === Dentro del radio de 25 km: esto es lo que se ve al abrir la app =====

  -- Urgentes, muy cerca. Encabezan la lista y pulsan en el mapa.
  ('rescate-centro', 180::double precision, 20::double precision,
   'Andrés Quintero', '+57 300 123 4567', 'rescate', 'alta',
   'Se cayó parte del muro trasero y mi vecino de 70 años quedó atrapado en el primer piso. No podemos mover los escombros solos.',
   'Barrio San Antonio', 1::int, 1::int, 6::int, 'active'::text, 7::int),

  ('rescate-sanfernando', 1200, 145,
   'Yeimy', '3155550199', 'rescate', 'alta',
   'Hay dos personas mayores en el tercer piso y la escalera está partida. Necesitamos ayuda para bajarlas.',
   'Barrio San Fernando', 2, null, 14, 'active', 7),

  ('salud-insulina', 820, 260,
   'Sandra Gómez Peláez', '(+57) 310-555-0134', 'salud', 'alta',
   'Mi mamá es diabética y se quedó sin insulina desde ayer. No hay droguería abierta en el sector.',
   'Barrio Normandía', 3, null, 27, 'active', 7),

  ('agua-edificio', 2500, 310,
   'Luisa Mejía', '300 123 4567', 'agua', 'alta',
   'Somos 9 personas en el edificio y llevamos dos días sin agua. Hay dos bebés y una señora en diálisis.',
   'Barrio Santa Mónica, torre 2', null, 2, 41, 'active', 7),

  -- Descripción larga (496 de los 500 caracteres que permite la tabla):
  -- comprueba que la tarjeta recorta y el detalle no.
  ('refugio-colegio', 900, 290,
   'Gloria Inés Bermúdez', '+57 320 555 7788', 'refugio', 'alta',
   'Estamos usando el patio del colegio como punto de encuentro del barrio. Somos alrededor de cuarenta personas, entre ellas doce niños y tres adultos mayores que no caminan bien. El salón grande quedó con grietas y nadie se atreve a entrar, así que llevamos dos noches afuera con lo que alcanzamos a sacar. Necesitamos carpas o plásticos grandes, colchonetas y algo para el frío de la madrugada. Si alguien tiene una lona o sabe de un salón comunal en pie, escríbanos y coordinamos el traslado hoy.',
   'Colegio de Santa Teresita, patio central', 2, 1, 52, 'active', 7),

  -- Descripción mínima (5 caracteres) y recién publicada: "hace un momento".
  ('agua-minima', 400, 70,
   'Wilson Pérez', '3009998877', 'agua', 'alta',
   'Agua.', 'Centro, Calle 12', null, null, 0, 'active', 7),

  -- Cerca del borde del radio. Si desaparece, el filtro de 25 km se rompió.
  ('comida-comedor', 22000, 95,
   'Comedor Comunitario La Esperanza', '6027435000', 'comida', 'alta',
   'Cocinamos para 120 personas al día. Nos quedan dos bultos de arroz. Necesitamos panela, aceite y agua embotellada.',
   'Candelaria, Valle del Cauca', null, null, 180, 'active', 7),

  ('rescate-villacarmelo', 19000, 247,
   'Familia Ramírez Ospina', '+57 301 555 2211', 'rescate', 'alta',
   'La casa de al lado se vino abajo y creemos que hay alguien adentro. Ya llamamos a la línea 123 pero no ha llegado nadie.',
   'Corregimiento Villacarmelo', 3, 2, 420, 'active', 7),

  -- Urgencia media
  ('refugio-techo', 1800, 200,
   'Marcela Ruiz', '3124445566', 'refugio', 'media',
   'Perdimos el techo de la casa. Buscamos dónde pasar la noche con mis dos hijos y un perro.',
   'Barrio Nueva Granada', 4, 3, 70, 'active', 7),

  ('ropa-cobijas', 4000, 30,
   'Jorge Patiño', '+57 313 555 9090', 'ropa', 'media',
   'Somos cuatro familias durmiendo en el parque. Hace mucho frío de madrugada, necesitamos cobijas.',
   'Barrio La Flora', 5, null, 120, 'active', 7),

  -- Nombre largo (59 caracteres): comprueba el truncado del encabezado.
  ('otro-nombre-largo', 3200, 15,
   'María del Carmen Villalobos Echeverri de la Espriella Rojas',
   '3187776655', 'otro', 'media',
   'Necesito que alguien me ayude a sacar unos documentos y las llaves de la casa. Yo sola no puedo levantar la puerta.',
   'Barrio Chipichape', null, null, 240, 'active', 7),

  ('comunicacion-senal', 6500, 175,
   'Diego Alejandro Restrepo Villegas', '+573155550199', 'comunicacion', 'media',
   'No hay señal en todo el sector y hay gente que no ha podido avisar a su familia. ¿Alguien tiene un punto con internet?',
   'Barrio El Limonar', null, null, 300, 'active', 7),

  ('salud-curaciones', 12000, 80,
   'Nubia Castellanos', '3001112233', 'salud', 'media',
   'Tengo formación de auxiliar de enfermería y estoy haciendo curaciones, pero se me acabaron las gasas y el alcohol.',
   'Puesto de salud improvisado, Juanchito', 6, null, 540, 'active', 7),

  ('agua-tanque', 18000, 250,
   'Fabián Ortiz', '300 444 5566', 'agua', 'media',
   'Conseguimos un tanque de 500 litros pero no tenemos cómo transportarlo hasta el barrio.',
   'Corregimiento Pichindé', null, 4, 840, 'active', 7),

  -- Sin avatar, sin foto y sin dirección: la fila más pelada posible.
  ('transporte-minimo', 700, 190,
   'Óscar Rueda', '3021234567', 'transporte', 'media',
   'Necesito llevar a mi hija al hospital y no consigo taxi ni ambulancia.',
   null, null, null, 45, 'active', 7),

  -- Urgencia baja: cierran la lista
  ('transporte-trasteo', 5000, 340,
   'Camila Torres', '+57 316 555 3344', 'transporte', 'baja',
   'Cuando se pueda, necesito ayuda para mover unos muebles a casa de mi hermana.',
   'Barrio Menga', null, null, 1200, 'active', 7),

  ('otro-perro', 8000, 120,
   'Hernán Duque', '3145556677', 'otro', 'baja',
   'Se me perdió el perro con el temblor. Es café, mediano, responde a Canela.',
   'Barrio El Poblado, Aguablanca', 1, null, 1800, 'active', 7),

  ('ropa-donacion', 15000, 60,
   'Beatriz Salazar', '3196668899', 'ropa', 'baja',
   'Tengo ropa de niño para donar. Necesito que alguien pase a recogerla porque no tengo cómo llevarla.',
   'Vía a Palmira, km 8', null, null, 2880, 'active', 7),

  -- === Fuera del radio: sólo salen si se niega la ubicación ===============
  -- (`posts_nearby` sin lat/lng devuelve lo más reciente del país entero)

  ('lejos-vijes', 35000, 355,
   'Ana Lucía Forero', '+57 321 555 1010', 'refugio', 'alta',
   'Se agrietaron tres casas de la cuadra y estamos todos en la plaza. Necesitamos dónde dormir esta noche.',
   'Vijes, Valle del Cauca', 4, null, 130, 'active', 7),

  ('lejos-quilichao', 45000, 190,
   'Élver Cárdenas', '3178889900', 'agua', 'media',
   'El acueducto veredal quedó roto. Somos unas treinta familias sin agua potable.',
   'Santander de Quilichao, Cauca', null, 3, 320, 'active', 7),

  ('lejos-buga', 70000, 25,
   'Brigada Barrio San José', '+57 310 555 4040', 'rescate', 'alta',
   'Brigada de vecinos removiendo escombros. Faltan herramientas: picas, palas y guantes.',
   'Buga, Barrio San José', 5, 4, 65, 'active', 7),

  ('lejos-buenaventura', 110000, 290,
   'Paola Arango', '3012223344', 'salud', 'media',
   'Estamos recogiendo medicamentos para mandar a la zona afectada. Necesitamos quién los transporte.',
   'Buenaventura, zona portuaria', 6, null, 480, 'active', 7),

  ('lejos-popayan', 140000, 195,
   'Junta de Acción Comunal El Retiro', '6028334455', 'comida', 'baja',
   'Tenemos mercados listos para enviar. Buscamos coordinar con alguien en la zona del sismo.',
   'Popayán, Barrio El Retiro', null, null, 1440, 'active', 7),

  -- === No deben aparecer nunca. Si salen, el filtrado está roto. ==========

  -- Ya resuelta.
  ('oculta-resuelta', 600, 100,
   'Ruth Amparo Niño', '3167778899', 'comida', 'alta',
   'Ya nos trajeron mercado, muchas gracias a todos. Esta solicitud ya está resuelta.',
   'Barrio El Peñón', null, null, 200, 'resolved', 7),

  -- Sigue en 'active' pero caducó hace dos días: prueba el `expires_at > now()`
  -- de `posts_nearby`, que es un filtro distinto al del estado.
  ('oculta-caducada', 500, 210,
   'Camilo Andrés Beltrán', '3183334455', 'rescate', 'alta',
   'Publicación vieja que ya venció. No debería verse en el mapa.',
   'Barrio San Antonio, Calle 2', null, null, 12960, 'active', 7)
)

insert into public.posts (
  user_id, name, avatar_url, whatsapp, category, description, urgency,
  lat, lng, address_label, photo_url, status, owner_token, created_at,
  updated_at, expires_at
)
select
  null,
  s.name,
  case when s.avatar_n is null then null
       else c.photos_base || 'avatar-' || s.avatar_n || '.png' end,
  s.whatsapp,
  s.category,
  s.description,
  s.urgency,
  -- Un grado de latitud son ~111,32 km en cualquier parte; uno de longitud
  -- se encoge con el coseno de la latitud.
  c.center_lat + (s.dist_m * cos(radians(s.bearing_deg))) / 111320.0,
  c.center_lng + (s.dist_m * sin(radians(s.bearing_deg)))
                 / (111320.0 * cos(radians(c.center_lat))),
  s.address_label,
  case when s.photo_n is null then null
       else c.photos_base || 'foto-' || s.photo_n || '.png' end,
  s.status,
  'seed:' || s.slug,
  now() - make_interval(mins => s.age_min),
  now() - make_interval(mins => s.age_min),
  now() - make_interval(mins => s.age_min) + make_interval(days => s.ttl_days)
from seed s cross join config c;

-- ---------------------------------------------------------------------------
-- Comprobación: exactamente lo que va a ver la app desde el centro sembrado.
-- Va suelto, fuera del CTE, así que si cambias `center_lat`/`center_lng`
-- arriba hay que repetir el cambio aquí. Deben salir 18 filas.
-- ---------------------------------------------------------------------------
select
  urgency,
  category,
  name,
  round(distance_m)::int as metros,
  address_label
from public.posts_nearby(3.4516, -76.532, 25000, 200);
