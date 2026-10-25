// Scrapes the public contribution calendar (no token needed) and writes
// data/contributions.json with the raw days plus derived stats.
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "ShaishtaP";
const url = `https://github.com/users/${USER}/contributions`;

const res = await fetch(url, { headers: { "User-Agent": `${USER}-profile-readme` } });
if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
const html = await res.text();

// Each day is a <td data-date data-level id>; its count lives in a <tool-tip for=id>.
const counts = new Map();
for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
  const n = m[2].match(/^(\d[\d,]*) contribution/);
  counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
}

const days = [];
for (const m of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
  const tag = m[0];
  const attr = (name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const date = attr("data-date");
  if (!date) continue;
  days.push({ date, level: Number(attr("data-level") || 0), count: counts.get(attr("id")) ?? 0 });
}
if (days.length < 300) throw new Error(`Only parsed ${days.length} days - page layout may have changed`);
days.sort((a, b) => a.date.localeCompare(b.date));

const total = days.reduce((s, d) => s + d.count, 0);

let longest = 0, run = 0;
for (const d of days) {
  run = d.count > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}

// Current streak: today may still be empty, so start from yesterday in that case.
let current = 0;
let i = days.length - 1;
if (days[i].count === 0) i--;
for (; i >= 0 && days[i].count > 0; i--) current++;

const best = days.reduce((b, d) => (d.count > b.count ? d : b), days[0]);
const activeDays = days.filter((d) => d.count > 0).length;

const monthly = {};
for (const d of days) monthly[d.date.slice(0, 7)] = (monthly[d.date.slice(0, 7)] || 0) + d.count;

const out = {
  user: USER,
  fetchedAt: new Date().toISOString(),
  stats: { total, activeDays, currentStreak: current, longestStreak: longest, bestDay: best },
  monthly,
  days,
};

mkdirSync("data", { recursive: true });
writeFileSync("data/contributions.json", JSON.stringify(out, null, 2) + "\n");
console.log(`${days.length} days, ${total} contributions, streak ${current}/${longest}`);
