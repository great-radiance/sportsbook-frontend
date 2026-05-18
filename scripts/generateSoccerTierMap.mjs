/**
 * Builds `src/data/soccerLeagueTierById.json` from `scripts/tree.json`.
 * Run: node scripts/generateSoccerTierMap.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const tree = JSON.parse(readFileSync(join(root, "tree.json"), "utf8"));
const soccer = tree.data.find((s) => s.name === "Soccer");

const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'");

/** tier 0 = international, 1 = top 6, 2 = strong, 3 = secondary, 4 = lower, 99 = rest */
const rules = [
  {
    tier: 0,
    test: (r, l) =>
      r === "international clubs" &&
      /^(uefa champions league|uefa europa league|uefa europa conference league)$/i.test(
        l,
      ),
  },
  {
    tier: 0,
    test: (r, l) =>
      r === "international" &&
      /^(european championship|world cup)$/i.test(l) &&
      !/women|u\d|qualif|prediction|special/i.test(l),
  },
  {
    tier: 1,
    test: (r, l) =>
      (r === "england" && /^premier league$/i.test(l)) ||
      (r === "england" && /^england - premier league$/i.test(l)) ||
      (r === "spain" && /^la liga$/i.test(l)) ||
      (r === "italy" && /^serie a$/i.test(l)) ||
      (r === "germany" && /^bundesliga$/i.test(l)) ||
      (r === "france" && /^ligue 1$/i.test(l)) ||
      (r === "portugal" && /^primeira liga$/i.test(l)),
  },
  {
    tier: 2,
    test: (r, l) =>
      (r === "netherlands" && l === "eredivisie") ||
      (r === "belgium" && l === "first division a") ||
      (r === "turkey" && l === "super lig") ||
      (r === "usa" && l === "major league soccer") ||
      (r === "argentina" &&
        (l === "superliga" ||
          l === "primera división" ||
          l === "primera division")) ||
      l === "campeonato brasileiro",
  },
  {
    tier: 3,
    test: (r, l) =>
      (r === "switzerland" && l === "super league") ||
      (r === "austria" && l === "bundesliga") ||
      (r === "denmark" && l === "superligaen") ||
      (r === "sweden" && l === "allsvenskan") ||
      (r === "norway" && l === "eliteserien") ||
      (r === "japan" && l === "j.league") ||
      (r === "republic of korea" && l === "k-league 1"),
  },
  {
    tier: 4,
    test: (r, l) =>
      (r === "england" &&
        /^(championship|league one|league two)$/i.test(l)) ||
      (r === "spain" && l === "la liga 2") ||
      (r === "italy" && l === "serie b") ||
      (r === "germany" && l === "2nd bundesliga"),
  },
];

const map = {};
for (const region of soccer.regions) {
  const r = norm(region.name);
  for (const league of region.leagues) {
    const l = norm(league.name);
    for (const rule of rules) {
      if (rule.test(r, l)) {
        map[league.id] = rule.tier;
        break;
      }
    }
  }
}

const outPath = join(root, "..", "src", "data", "soccerLeagueTierById.json");
writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n");
console.log(`Wrote ${Object.keys(map).length} tier entries to ${outPath}`);
