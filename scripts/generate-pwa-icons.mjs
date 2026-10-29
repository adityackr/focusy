/**
 * Generates the PWA icon set (public/icons/*.png) from the master artwork in
 * app/icon.svg, which stays the single source of truth for the logo.
 *
 *   bun scripts/generate-pwa-icons.mjs
 *
 * Outputs:
 * - icon-192/512.png    regular icons (rounded square, transparent corners)
 * - maskable-512.png    full-bleed background for Android adaptive icons —
 *                       Android crops to a circle/squircle, so the artwork
 *                       must fill the canvas edge-to-edge
 * - apple-touch-icon.png  full-bleed 180px for iOS (iOS masks corners itself
 *                       and shows black behind transparent pixels)
 */
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const outDir = new URL("public/icons/", root);
mkdirSync(outDir, { recursive: true });

const master = readFileSync(new URL("app/icon.svg", root), "utf8");

// Give the viewBox-only SVG an intrinsic size so sharp rasterises crisply.
const base = master.replace(
  'viewBox="0 0 48 48"',
  'width="48" height="48" viewBox="0 0 48 48"'
);

const PLAY_PATH =
  'M20.5 17.8v12.4c0 1.1 1.2 1.8 2.2 1.2l9.6-6.2c.9-.6.9-1.9 0-2.5l-9.6-6.2c-1-.6-2.2.1-2.2 1.3z';

// Full-bleed variant: same gradient, edge-to-edge background, logo nudged up
// in scale so it survives the ~20% shrink Android applies inside adaptive
// icons (the maskable safe zone is the inner 80% of the canvas).
const fullBleed = base
  .replace(
    '<rect x="4" y="4" width="40" height="40" rx="13" fill="url(#ft-tide)"/>',
    '<rect width="48" height="48" fill="url(#ft-tide)"/>'
  )
  .replace(
    `d="${PLAY_PATH}"`,
    `transform="translate(24 24.5) scale(1.15) translate(-24 -24.5)" d="${PLAY_PATH}"`
  );

async function png(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(file, outDir)));
  console.log(`  ${file} (${size}x${size})`);
}

console.log("Generating PWA icons → public/icons/");
await png(base, 192, "icon-192.png");
await png(base, 512, "icon-512.png");
await png(fullBleed, 512, "maskable-512.png");
await png(fullBleed, 180, "apple-touch-icon.png");
console.log("Done.");
