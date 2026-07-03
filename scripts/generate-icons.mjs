import sharp from "sharp";
import { mkdirSync } from "node:fs";

const PRIMARY = "#396580";

function squareSvg(size) {
  const fontSize = Math.round(size * 0.5);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${PRIMARY}" />
      <text
        x="50%"
        y="50%"
        font-family="-apple-system, Helvetica, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >M</text>
    </svg>
  `;
}

mkdirSync("public/icons", { recursive: true });

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log("wrote", outPath);
}

// Standard icons: glyph fills most of the square.
await render(squareSvg(192), 192, "public/icons/icon-192.png");
await render(squareSvg(512), 512, "public/icons/icon-512.png");
await render(squareSvg(512), 512, "app/icon.png");
await render(squareSvg(512), 512, "app/apple-icon.png");

// Maskable icon: keep the glyph within the inner ~80% safe zone.
function maskableSvg(size) {
  const fontSize = Math.round(size * 0.4);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${PRIMARY}" />
      <text
        x="50%"
        y="50%"
        font-family="-apple-system, Helvetica, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >M</text>
    </svg>
  `;
}
await render(maskableSvg(512), 512, "public/icons/icon-maskable-512.png");
