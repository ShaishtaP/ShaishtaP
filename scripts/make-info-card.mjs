// Hand-authored neofetch-style card: info-card.svg. Lines fade in on a stagger.
// Edit LINES when details change. STATIC=1 emits a frozen frame.
import { writeFileSync } from "node:fs";

const STATIC = process.env.STATIC === "1";
const W = 490, H = 522; // H matches ascii-portrait.svg at 370px wide
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const START = 2.2; // begin roughly as the portrait finishes its first rows

const C = { key: "#58a6ff", val: "#c9d1d9", dim: "#8b949e", green: "#39d353", pink: "#ff7b72", amber: "#e3b341" };

// [key, value] rows; null = blank line; { head } = section heading; { bullet } = highlight line.
const LINES = [
  { title: true },
  ["Name", "Shaishta Parween"],
  ["Role", "Software Engineer · DevOps & Cloud"],
  ["Edu", "B.Tech CSE '26 · GPA 9.34/10"],
  ["Loc", "New Delhi, India"],
  null,
  ["Prev", "DevOps Intern @ PearlThoughts"],
  ["", "Summer Intern @ DRDO (AppSec)"],
  null,
  ["Lang", "C++  Python  TypeScript  SQL"],
  ["Web", "React  Next.js  Node  FastAPI"],
  ["Cloud", "AWS  Docker  Terraform  GH Actions"],
  ["Data", "PostgreSQL  MongoDB  Redis"],
  null,
  { head: "Highlights" },
  { bullet: ["-40%", "deploy time · Actions + Docker CI/CD"] },
  { bullet: ["99.9%", "uptime · Strapi on AWS ECS + Nginx"] },
  { bullet: ["95%+", "txns auto-tagged · Finova (Gemini)"] },
  { bullet: ["<200ms", "API responses · FastAPI + Redis"] },
  null,
  ["Mail", "shaishta.dev@gmail.com"],
  { swatches: true },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const X = 22, KEYW = 62, LH = 21.6, Y0 = 66;

let y = Y0;
let n = 0;
const rows = [];
const line = (inner) => {
  const delay = (START + n++ * 0.09).toFixed(2);
  rows.push(`<g class="l" style="animation-delay:${delay}s">${inner}</g>`);
};

for (const L of LINES) {
  if (L === null) { y += LH * 0.55; continue; }
  if (L.title) {
    line(`<text x="${X}" y="${y}" font-size="14" font-weight="700"><tspan fill="${C.green}">shaishta</tspan><tspan fill="${C.dim}">@</tspan><tspan fill="${C.green}">github</tspan></text>` +
      `<text x="${X}" y="${y + 12}" font-size="13" fill="${C.dim}">${"-".repeat(15)}</text>`);
    y += LH + 8;
  } else if (L.head) {
    line(`<text x="${X}" y="${y}" font-size="13" font-weight="700" fill="${C.key}">${esc(L.head)}</text>`);
    y += LH;
  } else if (L.bullet) {
    const [num, rest] = L.bullet;
    line(`<text x="${X}" y="${y}" font-size="13"><tspan fill="${C.dim}">›</tspan> <tspan fill="${C.amber}" font-weight="700">${esc(num)}</tspan> <tspan fill="${C.val}">${esc(rest)}</tspan></text>`);
    y += LH;
  } else if (L.swatches) {
    const sw = ["#484f58", C.pink, C.green, C.amber, C.key, "#bc8cff", "#39c5cf", "#f0f6fc"]
      .map((c, i) => `<rect x="${X + i * 26}" y="${y - 8}" width="24" height="14" fill="${c}"/>`).join("");
    line(sw);
    y += LH;
  } else {
    const [k, v] = L;
    line(`<text x="${X}" y="${y}" font-size="13"><tspan fill="${C.key}" font-weight="700">${esc(k)}${k ? ":" : ""}</tspan></text>` +
      `<text x="${X + KEYW}" y="${y}" font-size="13" fill="${C.val}">${esc(v)}</text>`);
    y += LH;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Shaishta Parween - Software Engineer, DevOps and Cloud">
  <style>
    text { font-family: ${FONT}; }
    .l { ${STATIC ? "" : "opacity: 0; animation: in .35s ease-out forwards;"} }
    @keyframes in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#0d1117" stroke="#30363d"/>
  <circle cx="22" cy="20" r="5.5" fill="#ff5f56"/><circle cx="40" cy="20" r="5.5" fill="#ffbd2e"/><circle cx="58" cy="20" r="5.5" fill="#27c93f"/>
  <text x="${W / 2}" y="24" text-anchor="middle" font-size="12" fill="${C.dim}">neofetch</text>
  <line x1="0" y1="38" x2="${W}" y2="38" stroke="#21262d"/>
  ${rows.join("\n  ")}
</svg>
`;

writeFileSync("info-card.svg", svg);
console.log(`info-card.svg: ${n} lines, content ends at y=${Math.round(y)} of ${H}`);
