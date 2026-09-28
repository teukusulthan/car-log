/**
 * Renders the app icon (a speedometer gauge) to the PNG sizes iOS and the web manifest need.
 * Run with `pnpm icons` after changing the artwork.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BLUE = "#2451b7";

function svg({ size, padding, rounded }: { size: number; padding: number; rounded: boolean }) {
  const inner = size - padding * 2;
  const cx = size / 2;
  const cy = padding + inner * 0.58;
  const r = inner * 0.3;
  const stroke = inner * 0.075;
  const arc = (from: number, to: number) => {
    const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const needle = [cx + r * 0.78 * Math.cos((-50 * Math.PI) / 180), cy + r * 0.78 * Math.sin((-50 * Math.PI) / 180)];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${BLUE}"/>
  <path d="${arc(150, 390)}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="${stroke}" stroke-linecap="round"/>
  <path d="${arc(150, 310)}" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${needle[0]}" y2="${needle[1]}" stroke="#fff" stroke-width="${stroke * 0.8}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${stroke * 0.95}" fill="#fff"/>
  <rect x="${cx - inner * 0.16}" y="${cy + r * 0.62}" width="${inner * 0.32}" height="${stroke * 0.9}" rx="${stroke * 0.45}" fill="#fff"/>
</svg>`;
}

async function png(file: string, size: number, padding: number, rounded = false) {
  await sharp(Buffer.from(svg({ size, padding, rounded }))).png().toFile(file);
}

async function main() {
  await mkdir("public/icons", { recursive: true });
  await png("public/icons/icon-192.png", 192, 0);
  await png("public/icons/icon-512.png", 512, 0);
  await png("public/icons/maskable-512.png", 512, 64); // content inside the maskable safe zone
  await png("public/icons/badge-96.png", 96, 8);
  await png("src/app/apple-icon.png", 180, 0); // iOS applies its own corner mask
  await writeFile("src/app/icon.svg", svg({ size: 64, padding: 0, rounded: true }));
  console.log("icons written");
}

main();
