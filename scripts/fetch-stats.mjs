// Collects public GitHub numbers for the stats cards and writes data/stats.json.
// Uses GH_TOKEN / GITHUB_TOKEN when present (higher rate limit); works without one too.
// Only public, non-fork repos count. Jupyter Notebook is left out of languages because
// notebook files are mostly saved output, which would swamp the real code.
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "ShaishtaP";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const SKIP_LANGS = new Set(["Jupyter Notebook"]);

const api = async (path) => {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      "User-Agent": `${USER}-profile-readme`,
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
};

const repos = (await api(`users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork);
const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);

const langs = {};
for (const r of repos) {
  if (r.name.toLowerCase() === USER.toLowerCase()) continue; // the profile repo itself
  const l = await api(`repos/${USER}/${r.name}/languages`);
  for (const [k, v] of Object.entries(l)) if (!SKIP_LANGS.has(k)) langs[k] = (langs[k] || 0) + v;
}
const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
const languages = Object.entries(langs)
  .sort((a, b) => b[1] - a[1])
  .map(([name, bytes]) => ({ name, percent: Math.round((bytes / totalBytes) * 1000) / 10 }));

const prs = (await api(`search/issues?q=author:${USER}+type:pr`)).total_count;

const out = {
  user: USER,
  fetchedAt: new Date().toISOString(),
  publicRepos: repos.length,
  stars,
  pullRequests: prs,
  languages,
};

mkdirSync("data", { recursive: true });
writeFileSync("data/stats.json", JSON.stringify(out, null, 2) + "\n");
console.log(`${repos.length} repos, ${stars} stars, ${prs} PRs, top: ${languages.slice(0, 3).map((l) => l.name).join(", ")}`);
