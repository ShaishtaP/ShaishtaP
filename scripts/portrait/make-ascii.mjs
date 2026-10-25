// Local-only portrait pipeline. Photo -> ascii-portrait.svg (repo root).
//   node make-ascii.mjs <photo> [--crop x,y,w,h] [--gamma g] [--invert]
// Current portrait: node make-ascii.mjs fiza.pic.jpeg --crop 610,0,540,693 --gamma 1.6
// (crop aspect should stay ~0.78 = 600/770 so glyph cells aren't stretched)
// 1. crop to head + shoulders, 2. remove background (imgly / ONNX, runs offline),
// 3. CLAHE for local contrast, 4. map brightness to a glyph ramp, 5. emit an SVG that
// types itself in row by row (SMIL clip wipe + block cursor), then freezes.
// The photo and prepped image stay on this machine (*.jpg/*.png are gitignored).
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const photo = args.find((a) => !a.startsWith("--") && !/^\d/.test(a));
if (!photo) throw new Error("usage: node make-ascii.mjs <photo> [--crop x,y,w,h] [--invert]");
const opt = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1] ?? true; };

const COLS = 100, ROWS = 70;          // character grid
const CW = 6, CH = 11;                // cell size in SVG units (viewBox 600 x 770)
const W = COLS * CW, H = ROWS * CH;
const RAMP = " .`:-=+*cs#%@";         // sparse -> dense
const INVERT = Boolean(opt("invert")); // default: bright pixels print dense (light ink on dark panel)
const STATIC = process.env.STATIC === "1";

// --- 1. crop ---------------------------------------------------------------
const img = sharp(photo).rotate();
const meta = await img.metadata();
let [cx, cy, cw, ch] = opt("crop") ? String(opt("crop")).split(",").map(Number) : [0, 0, meta.width, meta.height];
const cropped = await sharp(photo).rotate().extract({ left: cx, top: cy, width: cw, height: ch }).png().toBuffer();

// --- 2. background removal ---------------------------------------------------
const cutBlob = await removeBackground(new Blob([cropped], { type: "image/png" }), { output: { format: "image/png" } });
const cut = Buffer.from(await cutBlob.arrayBuffer());

// --- 3. contrast ----------------------------------------------------------------
const lumaFull = await sharp(cut).flatten({ background: "#ffffff" }).greyscale()
  .clahe({ width: 48, height: 48, maxSlope: 3 }).normalise().png().toBuffer();
writeFileSync(resolve(HERE, "source-prepped.png"), await sharp(lumaFull).png().toBuffer());

const toGrid = async (buf) => sharp(buf).resize(COLS, ROWS, { fit: "fill" }).extractChannel(0).raw().toBuffer();
const luma = await toGrid(lumaFull);
const alpha = await toGrid(await sharp(cut).extractChannel(3).png().toBuffer());

// --- 4. glyphs ---------------------------------------------------------------------
// Stretch contrast over the subject only (2nd-98th percentile), so the white
// background doesn't compress the face into a few mid-tones.
const subject = [...luma].filter((_, i) => alpha[i] >= 110).sort((a, b) => a - b);
const lo = subject[Math.floor(subject.length * 0.02)], hi = subject[Math.floor(subject.length * 0.98)];
const GAMMA = Number(opt("gamma") ?? 1);
const lines = [];
for (let r = 0; r < ROWS; r++) {
  let s = "";
  for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    if (alpha[i] < 110) { s += " "; continue; }           // background -> blank
    let v = Math.min(1, Math.max(0, (luma[i] - lo) / (hi - lo))) ** GAMMA;
    if (INVERT) v = 1 - v;
    const k = Math.max(1, Math.round(v * (RAMP.length - 1))); // subject never fully blank
    s += RAMP[k];
  }
  lines.push(s);
}

// --- 5. SVG ------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const ROW_DUR = 0.22, ROW_GAP = 0.032, T0 = 0.3;
const PAD_X = 0, PAD_TOP = 0;

const defs = [];
const body = [];
lines.forEach((text, r) => {
  if (!text.trim()) return;
  const y = PAD_TOP + r * CH;
  const begin = (T0 + r * ROW_GAP).toFixed(3);
  // trim to the inked span so the wipe + cursor only travel where there is ink
  const first = text.search(/\S/), last = text.length - 1 - text.split("").reverse().join("").search(/\S/);
  const x0 = PAD_X + first * CW, x1 = PAD_X + (last + 1) * CW;
  const textEl = `<text x="${PAD_X}" y="${y + CH - 2.5}" textLength="${W}" lengthAdjust="spacing" xml:space="preserve">${esc(text)}</text>`;
  if (STATIC) { body.push(textEl); return; }
  defs.push(`<clipPath id="r${r}"><rect x="${x0}" y="${y}" width="0" height="${CH}"><animate attributeName="width" from="0" to="${x1 - x0}" begin="${begin}s" dur="${ROW_DUR}s" fill="freeze"/></rect></clipPath>`);
  body.push(`<g clip-path="url(#r${r})">${textEl}</g>`);
  body.push(`<rect class="cur" x="${x0}" y="${y + 1}" width="${CW}" height="${CH - 2}" opacity="0"><animate attributeName="x" from="${x0}" to="${x1}" begin="${begin}s" dur="${ROW_DUR}s" fill="freeze"/><set attributeName="opacity" to="0.9" begin="${begin}s" dur="${ROW_DUR}s"/></rect>`);
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="370" height="${Math.round((370 * (H + 76)) / W)}" viewBox="0 0 ${W} ${H + 76}" role="img" aria-label="ASCII portrait of Shaishta Parween">
  <style>
    text { font-family: ${FONT}; font-size: 10px; fill: #c9d1d9; }
    .cur { fill: #39d353; }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H + 75}" rx="16" fill="#0d1117" stroke="#30363d" stroke-width="1.6"/>
  <circle cx="34" cy="31" r="9" fill="#ff5f56"/><circle cx="62" cy="31" r="9" fill="#ffbd2e"/><circle cx="90" cy="31" r="9" fill="#27c93f"/>
  <text x="${W / 2}" y="37" text-anchor="middle" style="font-size:19px;fill:#8b949e">cat portrait.txt</text>
  <line x1="0" y1="61" x2="${W}" y2="61" stroke="#21262d" stroke-width="1.6"/>
  <defs>${defs.join("")}</defs>
  <g transform="translate(0 68)">
  ${body.join("\n  ")}
  </g>
</svg>
`;

const out = resolve(HERE, "..", "..", "ascii-portrait.svg");
writeFileSync(out, svg);
console.log(lines.join("\n"));
console.log(`\n${out}: ${COLS}x${ROWS} glyphs${INVERT ? " (inverted)" : ""}`);
