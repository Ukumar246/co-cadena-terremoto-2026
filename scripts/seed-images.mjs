/**
 * Genera y sube al bucket `photos` las imágenes que usa `supabase/seed.sql`.
 *
 *   node scripts/seed-images.mjs        # genera y sube
 *   node scripts/seed-images.mjs --local  # sólo escribe en .seed-images/ para mirarlas
 *
 * ¿Por qué no enlazar a un servicio de avatares de internet? Porque
 * `next.config.ts` sólo autoriza imágenes del host de Supabase Storage, y
 * `next/image` lanza un error en tiempo de ejecución con cualquier otro host.
 * Si las fotos de prueba no viven en el bucket, la mitad de las pantallas no
 * se puede probar.
 *
 * Los dibujos son deliberadamente esquemáticos: sirven para ver recortes,
 * bordes redondeados y proporciones, no para simular una foto real de un
 * desastre. Son deterministas, así que volver a ejecutarlo no cambia nada.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "./png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "photos";
/** Prefijo dentro del bucket. `seed.sql` construye las URLs con estas rutas. */
const PREFIX = "seed";

// --- Entorno -----------------------------------------------------------------

/**
 * Mismo orden de precedencia que Next: `.env.local` pisa a `.env`. No usamos
 * `--env-file` para que el script funcione igual con `npm run` y a pelo.
 */
function loadEnv() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    let text;
    try {
      text = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

// --- Dibujo ------------------------------------------------------------------

/** PRNG determinista: dos ejecuciones producen bytes idénticos. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SS = 3; // muestras por eje: suaviza los bordes de las siluetas

function insideCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function insideRotatedRect(x, y, cx, cy, halfW, halfH, angle) {
  const dx = x - cx;
  const dy = y - cy;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  return (
    Math.abs(dx * cos - dy * sin) <= halfW && Math.abs(dx * sin + dy * cos) <= halfH
  );
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Recorre cada píxel con supermuestreo y deja que `shade(x, y)` devuelva el
 * color en coordenadas continuas. Las imágenes son opacas: van dentro de un
 * `<img>` con `object-fit: cover`, no necesitan canal alfa útil.
 */
function render(width, height, shade) {
  const pixels = Buffer.alloc(width * height * 4);
  const step = 1 / SS;
  const samples = SS * SS;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const color = shade(px + (sx + 0.5) * step, py + (sy + 0.5) * step);
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const offset = (py * width + px) * 4;
      pixels[offset] = Math.round(r / samples);
      pixels[offset + 1] = Math.round(g / samples);
      pixels[offset + 2] = Math.round(b / samples);
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}

/** Avatar: silueta genérica de persona sobre un disco de color. */
function renderAvatar(size, base) {
  const cx = size / 2;
  const light = mix(base, [255, 255, 255], 0.82);
  const backdrop = mix(base, [255, 255, 255], 0.12);

  return render(size, size, (x, y) => {
    if (!insideCircle(x, y, cx, cx, size / 2)) return [255, 255, 255];
    const head = insideCircle(x, y, cx, size * 0.38, size * 0.155);
    const body = insideEllipse(x, y, cx, size * 0.96, size * 0.29, size * 0.27);
    if (head || body) return light;
    // Degradado suave para que el recorte circular se note en pantalla.
    return mix(backdrop, base, y / size);
  });
}

/**
 * "Foto de la situación": cielo con polvo, suelo y unos bloques de escombro.
 * 4:3 porque el detalle la encierra en un `aspect-[4/3]`.
 */
function renderScene(width, height, palette, seed) {
  const random = mulberry32(seed);
  const horizon = height * 0.58;

  const blocks = Array.from({ length: 7 }, () => ({
    cx: random() * width,
    cy: horizon + random() * (height - horizon) * 0.95,
    halfW: width * (0.05 + random() * 0.09),
    halfH: height * (0.03 + random() * 0.07),
    angle: (random() - 0.5) * 0.9,
    tone: mix(palette.rubble, [255, 255, 255], random() * 0.45),
  }));

  // La grieta cruza el suelo en diagonal: da una referencia de escala.
  const crack = { x0: width * 0.12, y0: height, x1: width * 0.74, y1: horizon };

  return render(width, height, (x, y) => {
    let color;
    if (y < horizon) {
      color = mix(palette.skyTop, palette.skyBottom, y / horizon);
    } else {
      color = mix(palette.groundTop, palette.groundBottom, (y - horizon) / (height - horizon));

      const t = (y - crack.y0) / (crack.y1 - crack.y0);
      if (t >= 0 && t <= 1) {
        const cxLine = crack.x0 + (crack.x1 - crack.x0) * t;
        const halfWidth = 5 - 3 * t;
        if (Math.abs(x - cxLine) < halfWidth) color = palette.crack;
      }
    }

    for (const block of blocks) {
      if (insideRotatedRect(x, y, block.cx, block.cy, block.halfW, block.halfH, block.angle)) {
        color = block.tone;
      }
    }

    return color;
  });
}

// --- Catálogo ----------------------------------------------------------------

const AVATAR_COLORS = [
  [180, 83, 9], // ámbar quemado
  [15, 92, 74], // verde de marca
  [126, 34, 106], // ciruela
  [30, 64, 175], // azul
  [153, 27, 27], // rojo tierra
  [63, 98, 18], // oliva
];

const SCENES = [
  {
    skyTop: [116, 132, 152],
    skyBottom: [198, 186, 170],
    groundTop: [124, 110, 96],
    groundBottom: [82, 72, 63],
    rubble: [150, 142, 132],
    crack: [46, 40, 35],
  },
  {
    skyTop: [148, 130, 108],
    skyBottom: [214, 190, 158],
    groundTop: [138, 118, 98],
    groundBottom: [92, 78, 64],
    rubble: [166, 152, 136],
    crack: [54, 44, 36],
  },
  {
    skyTop: [96, 108, 124],
    skyBottom: [166, 172, 176],
    groundTop: [108, 106, 104],
    groundBottom: [70, 69, 68],
    rubble: [140, 138, 136],
    crack: [38, 38, 38],
  },
  {
    skyTop: [132, 120, 138],
    skyBottom: [206, 184, 176],
    groundTop: [130, 112, 106],
    groundBottom: [86, 74, 70],
    rubble: [158, 146, 140],
    crack: [48, 40, 38],
  },
];

function buildAll() {
  const files = [];

  AVATAR_COLORS.forEach((color, index) => {
    files.push({
      path: `${PREFIX}/avatar-${index + 1}.png`,
      body: encodePng(256, renderAvatar(256, color), 256),
    });
  });

  SCENES.forEach((palette, index) => {
    const width = 800;
    const height = 600;
    files.push({
      path: `${PREFIX}/foto-${index + 1}.png`,
      body: encodePng(width, renderScene(width, height, palette, index + 1), height),
    });
  });

  return files;
}

// --- Subida ------------------------------------------------------------------

/**
 * Devuelve "subida" o "ya estaba".
 *
 * Con la service role key se puede reemplazar (`x-upsert`). Con la clave
 * pública no: la política del bucket concede INSERT pero no UPDATE, así que un
 * segundo intento contesta 409. No es un fallo — el contenido es determinista,
 * el objeto que ya está allí es byte a byte el que íbamos a subir.
 */
async function upload(baseUrl, key, file, canUpsert) {
  const endpoint = `${baseUrl}/storage/v1/object/${BUCKET}/${file.path}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "image/png",
      ...(canUpsert ? { "x-upsert": "true" } : {}),
    },
    body: file.body,
  });

  if (response.status === 409 && !canUpsert) return "ya estaba";
  if (!response.ok) {
    throw new Error(`${file.path}: ${response.status} ${await response.text()}`);
  }
  return "subida";
}

// --- Main --------------------------------------------------------------------

const localOnly = process.argv.includes("--local");
const files = buildAll();

if (localOnly) {
  const outDir = join(ROOT, ".seed-images");
  mkdirSync(join(outDir, PREFIX), { recursive: true });
  for (const file of files) {
    writeFileSync(join(outDir, file.path), file.body);
    console.log(`${file.path.padEnd(22)} ${(file.body.length / 1024).toFixed(1)} kB`);
  }
  console.log(`\nEscritas en ${outDir} (no subidas).`);
  process.exit(0);
}

const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

// La service role key es opcional: el bucket `photos` acepta subidas anónimas
// a propósito (es como publica la gente desde la app). Se prefiere si está
// porque permite reemplazar objetos en vez de conservar el primero.
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const key = serviceKey || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const canUpsert = Boolean(serviceKey);

if (!baseUrl || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o una clave (NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
      "o SUPABASE_SERVICE_ROLE_KEY) en .env / .env.local.\n" +
      "Para ver las imágenes sin subirlas: node scripts/seed-images.mjs --local",
  );
  process.exit(1);
}

console.log(`Bucket "${BUCKET}" en ${baseUrl}`);
console.log(canUpsert ? "Clave: service role (reemplaza)\n" : "Clave: pública (no reemplaza)\n");

for (const file of files) {
  const outcome = await upload(baseUrl, key, file, canUpsert);
  console.log(
    `${file.path.padEnd(22)} ${(file.body.length / 1024).toFixed(1).padStart(5)} kB  ${outcome}`,
  );
}

console.log(
  `\nBase pública: ${baseUrl}/storage/v1/object/public/${BUCKET}/${PREFIX}/\n` +
    "Es la que espera supabase/seed.sql en `photos_base`.",
);
