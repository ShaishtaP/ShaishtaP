// Renders data/contributions.json as an animated 53-week heatmap: contrib-heatmap.svg.
// Boxes slide in on a diagonal once, then freeze. STATIC=1 emits a frozen frame.
import { readFileSync, writeFileSync } from "node:fs";

const STATIC = process.env.STATIC === "1";
const { user, stats, days } = JSON.parse(readFileSync("data/contributions.json", "utf8"));

const PALETTE = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const NEON = "#69f0a0"; // the single best day

const W = 860;
const CELL = 11, GAP = 3, STEP = CELL + GAP;
const TOP = 74;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// Lay days into week columns; the first column may start mid-week.
const dow = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
const cells = [];
let week = 0;
days.forEach((d, i) => {
  if (i > 0 && dow(d.date) === 0) week++;
  cells.push({ ...d, week, day: dow(d.date) });
});
const weeks = week + 1;
const gridW = weeks * STEP - GAP;
const gridH = 7 * STEP - GAP;
const LEFT = Math.round((W - gridW) / 2) + 12; // centre the grid, nudged right for day labels
const RIGHT = LEFT + gridW;

const monthLabels = [];
let lastMonth = -1;
for (const c of cells) {
  const m = Number(c.date.slice(5, 7)) - 1;
  if (c.day === 0 && m !== lastMonth) {
    const x = LEFT + c.week * STEP;
    // a partial first month leaves no room for its label: the next month wins
    const prev = monthLabels.at(-1);
    if (prev && x - prev.x < 3 * STEP) monthLabels.pop();
    if (c.week < weeks - 2) monthLabels.push({ x, text: MONTHS[m] });
    lastMonth = m;
  }
}

const H = TOP + gridH + 78;
const isBest = (c) => stats.bestDay.count > 0 && c.date === stats.bestDay.date;

const rects = cells
  .map((c) => {
    const x = LEFT + c.week * STEP;
    const y = TOP + c.day * STEP;
    const fill = isBest(c) ? NEON : PALETTE[Math.min(c.level, 4)];
    const delay = ((c.week + c.day) * 0.018).toFixed(3);
    const title = `${c.count} contribution${c.count === 1 ? "" : "s"} on ${fmtDate(c.date)}`;
    return `<rect class="d" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}" style="animation-delay:${delay}s"><title>${esc(title)}</title></rect>`;
  })
  .join("\n    ");

const lastDelay = (weeks + 6) * 0.018 + 0.4;
// Less [][][][][] More, right-aligned to the grid
const swatchX = RIGHT - 30 - 5 * STEP;
const legendY = TOP + gridH + 22;
const legend = PALETTE.map(
  (c, i) => `<rect x="${swatchX + i * STEP}" y="${legendY - 10}" width="${CELL}" height="${CELL}" rx="2.5" fill="${c}"/>`
).join("");

const n = (v) => v.toLocaleString("en-US");
const footer =
  `${n(stats.total)} contributions in the last year  ·  ` +
  `current streak ${stats.currentStreak}d  ·  longest ${stats.longestStreak}d  ·  ` +
  (stats.bestDay.count > 0 ? `best day ${stats.bestDay.count} (${fmtDate(stats.bestDay.date)})` : "best day -");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(user)}: ${esc(footer)}">
  <title>${esc(footer)}</title>
  <style>
    text { font-family: ${FONT}; }
    .d { transform-box: fill-box; transform-origin: center; ${STATIC ? "" : "opacity: 0; animation: drop .45s cubic-bezier(.2,.8,.2,1) forwards;"} }
    .fade { ${STATIC ? "" : `opacity: 0; animation: fade .6s ease-out ${lastDelay.toFixed(2)}s forwards;`} }
    @keyframes drop { from { opacity: 0; transform: translateY(-6px) scale(.6); } to { opacity: 1; transform: none; } }
    @keyframes fade { to { opacity: 1; } }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#0d1117" stroke="#30363d"/>
  <circle cx="22" cy="20" r="5.5" fill="#ff5f56"/><circle cx="40" cy="20" r="5.5" fill="#ffbd2e"/><circle cx="58" cy="20" r="5.5" fill="#27c93f"/>
  <text x="${W / 2}" y="24" text-anchor="middle" font-size="12" fill="#8b949e">${esc(user)}@github: ~/contributions</text>
  <line x1="0" y1="38" x2="${W}" y2="38" stroke="#21262d"/>
  ${monthLabels.map((m) => `<text x="${m.x}" y="${TOP - 9}" font-size="11" fill="#8b949e">${m.text}</text>`).join("")}
  ${[["Mon", 1], ["Wed", 3], ["Fri", 5]].map(([t, d]) => `<text x="${LEFT - 10}" y="${TOP + d * STEP + 10}" font-size="11" fill="#8b949e" text-anchor="end">${t}</text>`).join("")}
  <g>
    ${rects}
  </g>
  <g class="fade">
    <text x="${swatchX - 6}" y="${legendY}" font-size="11" fill="#8b949e" text-anchor="end">Less</text>
    ${legend}
    <text x="${RIGHT}" y="${legendY}" font-size="11" fill="#8b949e" text-anchor="end">More</text>
    <text x="${LEFT}" y="${legendY}" font-size="11" fill="#8b949e"><tspan fill="#39d353">$</tspan> ./contributions.sh --last-year</text>
    <text x="${LEFT}" y="${legendY + 28}" font-size="12.5" fill="#c9d1d9">${esc(footer)}</text>
  </g>
</svg>
`;

writeFileSync("contrib-heatmap.svg", svg);
console.log(`contrib-heatmap.svg: ${weeks} weeks, ${W}x${H}`);
