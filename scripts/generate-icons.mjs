/**
 * Genera los iconos PNG de la PWA a partir de un icono de Lucide.
 *
 *   npm run icons
 *
 * Antes este script rasterizaba a mano un pin de mapa con matemáticas de
 * formas. Ya no: el dibujo sale de `lucide-react`, la misma librería que usa
 * la interfaz, así que el icono de la app y el de la cabecera son literalmente
 * el mismo trazo. Aquí sólo se compone el fondo y se rasteriza.
 *
 * Volver a ejecutarlo si cambian el icono o los colores de marca.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HandHeart } from "lucide-react";
import sharp from "sharp";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app");

/** Verde de marca: el mismo `--primary` y `theme_color` del manifiesto. */
const BRAND = "#0f5c4a";

/** El icono de la app es el mismo que preside la cabecera del mapa. */
const ICON = HandHeart;

/**
 * Compone el SVG final: fondo + glifo de Lucide centrado.
 *
 * `maskable` deja el cuadrado a sangre y encoge el dibujo, porque Android
 * recorta hasta un 20% por lado y puede aplicar su propia máscara.
 */
function buildSvg(size, { maskable = false } = {}) {
  const cornerRadius = maskable ? 0 : size * 0.22;
  const glyphSize = Math.round(size * (maskable ? 0.42 : 0.56));
  const offset = Math.round((size - glyphSize) / 2);

  // Lucide devuelve un `<svg viewBox="0 0 24 24">` completo. Se anida tal cual
  // dentro del lienzo con `x`/`y`: así no hay que tocar sus trazos ni conocer
  // su estructura interna.
  const glyph = renderToStaticMarkup(
    createElement(ICON, {
      size: glyphSize,
      color: "#ffffff",
      strokeWidth: 1.75,
    }),
  ).replace("<svg", `<svg x="${offset}" y="${offset}"`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${BRAND}"/>
  ${glyph}
</svg>`;
}

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
  const png = await sharp(Buffer.from(buildSvg(size, options)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`${file.padEnd(26)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`);
}

// `src/app/icon.png` es la convención de Next para el favicon.
const favicon = await sharp(Buffer.from(buildSvg(32)))
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(APP_DIR, "icon.png"), favicon);
console.log(`${"src/app/icon.png".padEnd(26)} 32×32  ${(favicon.length / 1024).toFixed(1)} kB`);
