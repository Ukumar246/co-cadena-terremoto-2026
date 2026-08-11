/**
 * Genera los iconos PNG de la PWA sin depender de ImageMagick ni de librerías
 * externas: rasteriza las formas a mano con supermuestreo y las empaqueta en
 * PNG con zlib.
 *
 *   node scripts/generate-icons.mjs
 *
 * Volver a ejecutarlo si cambian los colores de marca.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BRAND = [15, 92, 74]; // #0f5c4a
const WHITE = [255, 255, 255];

/** Muestras por eje dentro de cada píxel. 4x4 da bordes suaves de sobra. */
const SS = 4;

// --- Formas ------------------------------------------------------------------

function insideRoundRect(x, y, size, radius) {
  const cx = size / 2;
  const cy = size / 2;
  const hw = size / 2;
  const hh = size / 2;
  const qx = Math.abs(x - cx) - hw + radius;
  const qy = Math.abs(y - cy) - hh + radius;
  // SDF estándar de rectángulo redondeado: negativo dentro, positivo fuera.
  const distance =
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    radius;
  return distance <= 0;
}

function insideCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideTriangle(x, y, ax, ay, bx, by, cx, cy) {
  const sign = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = sign(x, y, ax, ay, bx, by);
  const d2 = sign(x, y, bx, by, cx, cy);
  const d3 = sign(x, y, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Un pin de mapa: cabeza circular, cola triangular y un hueco al centro.
 * `scale` encoge el dibujo para respetar la zona segura de los iconos
 * maskable (Android recorta hasta un 20% por lado).
 */
function pinCoverage(x, y, size, scale) {
  const cx = size / 2;
  const headY = size * (0.5 - 0.08 * scale);
  const headR = size * 0.19 * scale;
  const tipY = size * (0.5 + 0.25 * scale);
  const baseY = headY + headR * 0.42;
  const baseHalf = headR * 0.76;
  const holeR = headR * 0.39;

  const inHead = insideCircle(x, y, cx, headY, headR);
  const inTail = insideTriangle(
    x, y,
    cx, tipY,
    cx - baseHalf, baseY,
    cx + baseHalf, baseY,
  );
  const inHole = insideCircle(x, y, cx, headY, holeR);

  return (inHead || inTail) && !inHole;
}

// --- Rasterizado -------------------------------------------------------------

function renderIcon(size, { maskable = false, opaque = true } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const cornerRadius = maskable ? 0 : size * 0.22;
  const contentScale = maskable ? 0.72 : 1;
  const step = 1 / SS;
  const samples = SS * SS;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgHits = 0;
      let pinHits = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) * step;
          const y = py + (sy + 0.5) * step;
          if (insideRoundRect(x, y, size, cornerRadius)) bgHits++;
          if (pinCoverage(x, y, size, contentScale)) pinHits++;
        }
      }

      const bg = bgHits / samples;
      const pin = pinHits / samples;

      // El pin sólo pinta dentro del fondo; fuera de él todo es transparente.
      const pinInside = Math.min(pin, bg);
      const alpha = opaque || !maskable ? bg : 1;

      const mix = (channel) =>
        Math.round(BRAND[channel] * (1 - pinInside) + WHITE[channel] * pinInside);

      const offset = (py * size + px) * 4;
      pixels[offset] = mix(0);
      pixels[offset + 1] = mix(1);
      pixels[offset + 2] = mix(2);
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return pixels;
}

// --- Codificador PNG ---------------------------------------------------------

const crc32 =
  zlib.crc32 ??
  (() => {
    const table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
    return (buf) => {
      let c = 0xffffffff;
      for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
  })();

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData) >>> 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sin entrelazado

  // Una fila = 1 byte de filtro (0 = ninguno) + los píxeles.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Salida ------------------------------------------------------------------

const TARGETS = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: {} },
  { file: "icon-maskable-512.png", size: 512, options: { maskable: true } },
  // iOS ignora la transparencia y el radio: pinta el cuadrado completo.
  { file: "apple-touch-icon.png", size: 180, options: { maskable: true } },
  { file: "favicon-32.png", size: 32, options: {} },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, size, options } of TARGETS) {
  const png = encodePng(size, renderIcon(size, options));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`${file.padEnd(26)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`);
}
