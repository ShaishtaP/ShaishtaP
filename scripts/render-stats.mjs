// Draws two terminal-style cards from data/stats.json + data/contributions.json:
//   github-stats.svg  (contributions, streaks, repos, stars, PRs)
//   top-langs.svg     (language bar + legend)
// Rows fade in once, then stay. STATIC=1 emits frozen frames.
import { readFileSync, writeFileSync } from "node:fs";

const STATIC = process.env.STATIC === "1";
const s = JSON.parse(readFileSync("data/stats.json", "utf8"));
const c = JSON.parse(readFileSync("data/contributions.json", "utf8")).stats;

const W = 420, H = 230;
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const C = { bg: "#0d1117", border: "#30363d", key: "#58a6ff", val: "#c9d1d9", dim: "#8b949e", green: "#39d353", amber: "#e3b341" };
// GitHub's own language colours
const LANG = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", CSS: "#663399", HTML: "#e34c26",
  "C++": "#f34b7d", Shell: "#89e051", Dockerfile: "#384d54", HCL: "#844FBA", PLpgSQL: "#336790",
};
const OTHER = "#6e7681";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const frame = (title, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" font-family="${FONT}">
<style>
.l{opacity:${STATIC ? 1 : 0};${STATIC ? "" : "animation:in .4s ease-out forwards;"}}
@keyframes in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.l{animation:none;opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="${C.bg}" stroke="${C.border}"/>
<circle cx="18" cy="16" r="4.5" fill="#ff5f56"/><circle cx="32" cy="16" r="4.5" fill="#ffbd2e"/><circle cx="46" cy="16" r="4.5" fill="#27c93f"/>
<text x="${W / 2}" y="20" text-anchor="middle" font-size="11" fill="${C.dim}">${esc(title)}</text>
<line x1="0" y1="31" x2="${W}" y2="31" stroke="${C.border}"/>
${body}
</svg>
`;

let n = 0;
const row = (inner) => `<g class="l" style="animation-delay:${(0.2 + n++ * 0.12).toFixed(2)}s">${inner}</g>`;

// ---- github-stats.svg
n = 0;
const X = 22, VX = 250;
const items = [
  ["Contributions (1y)", c.total],
  ["Current streak", `${c.currentStreak} days`],
  ["Longest streak", `${c.longestStreak} days`],
  ["Active days (1y)", c.activeDays],
  ["Public repos", s.publicRepos],
  ["Stars earned", s.stars],
  ["Pull requests", s.pullRequests],
];
let y = 56;
let body = row(`<text x="${X}" y="${y}" font-size="13"><tspan fill="${C.green}" font-weight="700">$</tspan> <tspan fill="${C.val}">gh stats --user ${esc(s.user)}</tspan></text>`);
y += 26;
for (const [k, v] of items) {
  body += row(`<text x="${X}" y="${y}" font-size="13" fill="${C.key}" font-weight="700">${esc(k)}</text>` +
    `<text x="${VX}" y="${y}" font-size="13" fill="${k.includes("streak") ? C.amber : C.val}" font-weight="${k.includes("streak") ? 700 : 400}">${esc(v)}</text>`);
  y += 20;
}
writeFileSync("github-stats.svg", frame("stats", body,
  `GitHub stats: ${c.total} contributions in the last year, current streak ${c.currentStreak} days, longest ${c.longestStreak} days, ${s.publicRepos} public repos`));

// ---- top-langs.svg
n = 0;
const top = s.languages.slice(0, 6);
const rest = s.languages.slice(6).reduce((a, l) => a + l.percent, 0);
if (rest >= 0.1) top.push({ name: "Other", percent: Math.round(rest * 10) / 10 });
const colour = (name) => LANG[name] || OTHER;

y = 56;
body = row(`<text x="${X}" y="${y}" font-size="13"><tspan fill="${C.green}" font-weight="700">$</tspan> <tspan fill="${C.val}">gh langs --top 6</tspan></text>`);
y += 18;
// stacked bar
const BW = W - 2 * X;
let bx = X, bar = `<clipPath id="r"><rect x="${X}" y="${y}" width="${BW}" height="10" rx="5"/></clipPath><g clip-path="url(#r)">`;
const sum = top.reduce((a, l) => a + l.percent, 0) || 1;
for (const l of top) {
  const w = (l.percent / sum) * BW;
  bar += `<rect x="${bx.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="10" fill="${colour(l.name)}"/>`;
  bx += w;
}
body += row(bar + "</g>");
y += 34;
// legend, two columns
top.forEach((l, i) => {
  const col = i % 2, r = Math.floor(i / 2);
  const lx = X + col * 195, ly = y + r * 24;
  body += row(`<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${colour(l.name)}"/>` +
    `<text x="${lx + 16}" y="${ly}" font-size="13" fill="${C.val}">${esc(l.name)}</text>` +
    `<text x="${lx + 175}" y="${ly}" font-size="13" fill="${C.dim}" text-anchor="end">${l.percent.toFixed(1)}%</text>`);
});
writeFileSync("top-langs.svg", frame("languages", body,
  `Top languages across public repos: ${top.map((l) => `${l.name} ${l.percent}%`).join(", ")}`));

console.log(`github-stats.svg, top-langs.svg (${top.map((l) => l.name).join(", ")})`);
