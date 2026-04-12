type HG<T> = { h?: T; g?: T };

type NormalizedScore = {
  phase?: string;
  clock?: {
    display?: string | null;
    seconds?: number | null;
    direction?: "up" | "down" | "unknown";
  };

  mainScore: { home: number | null; away: number | null; unit: string; sourceKey: string | null };

  segments: Array<{
    type:
      | "quarter"
      | "half"
      | "period"
      | "set"
      | "inning"
      | "map"
      | "game"
      | "overtime"
      | "extra_time"
      | "penalties"
      | "unknown";
    index: number | null;
    label: string;
    home: number | string | null;
    away: number | string | null;
    sourceKey: string;
  }>;

  indicator?: { type: "possession" | "servis"; who: "home" | "away" | null };

  stats: Record<string, { home: number | null; away: number | null }>;
};

const MAIN_SCORE_PRIORITY = [
  "goals",
  "runs",
  "total",
  "sets",
  "maps",
  "games",
  "frames",
  "scores",
  "leg",
  "points",
] as const;
type MainKey = (typeof MAIN_SCORE_PRIORITY)[number];

function isNilish(v: any) {
  return (
    v === null || v === undefined || v === -1 || v === "-1" || v === "" || v === "''" || v === " ''"
  );
}

function toNum(v: any): number | null {
  if (isNilish(v)) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s === "''") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toBool(v: any): boolean | null {
  if (isNilish(v)) return null;
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function readHG(obj: any): { home: any; away: any } {
  if (!obj || typeof obj !== "object") return { home: null, away: null };
  const h = obj.h ?? obj.home;
  const g = obj.g ?? obj.away;
  return { home: isNilish(h) ? null : h, away: isNilish(g) ? null : g };
}

// fast parse like "q3" -> {prefix:"q", num:3} else null
function parsePrefixedIndex(key: string): { prefix: string; num: number } | null {
  if (key.length < 2) return null;
  const prefix = key[0];
  // only these are segment-like
  if (
    prefix !== "q" &&
    prefix !== "s" &&
    prefix !== "p" &&
    prefix !== "i" &&
    prefix !== "m" &&
    prefix !== "g"
  )
    return null;
  let num = 0;
  for (let i = 1; i < key.length; i++) {
    const c = key.charCodeAt(i);
    if (c < 48 || c > 57) return null;
    num = num * 10 + (c - 48);
  }
  return num > 0 ? { prefix, num } : null;
}

function segType(prefix: string): NormalizedScore["segments"][number]["type"] {
  switch (prefix) {
    case "q":
      return "quarter";
    case "s":
      return "set";
    case "p":
      return "period";
    case "i":
      return "inning";
    case "m":
      return "map";
    case "g":
      return "game";
    default:
      return "unknown";
  }
}

function segLabel(prefix: string, num: number) {
  return prefix.toUpperCase() + String(num); // Q1, S2, P3...
}

function parseClock(timeValue: any): NormalizedScore["clock"] {
  if (isNilish(timeValue)) return { display: null, seconds: null, direction: "unknown" };
  if (typeof timeValue === "string") {
    const s = timeValue.trim();
    // mm:ss
    const colon = s.indexOf(":");
    if (colon > 0) {
      const mm = Number(s.slice(0, colon));
      const ss = Number(s.slice(colon + 1));
      if (Number.isFinite(mm) && Number.isFinite(ss))
        return { display: s, seconds: mm * 60 + ss, direction: "down" };
    }
    const n = toNum(s);
    if (n !== null) return { display: s, seconds: n * 60, direction: "up" };
    return { display: s, seconds: null, direction: "unknown" };
  }
  if (typeof timeValue === "number")
    return { display: String(timeValue), seconds: timeValue, direction: "unknown" };
  return { display: null, seconds: null, direction: "unknown" };
}

export function normalizeScoreboardFast(raw: any): NormalizedScore {
  const out: NormalizedScore = {
    phase: raw?.state ? String(raw.state) : undefined,
    clock: parseClock(raw?.time),
    mainScore: { home: null, away: null, unit: "unknown", sourceKey: null },
    segments: [],
    stats: {},
  };

  if (!raw || typeof raw !== "object") return out;

  // Track best main score by priority
  let bestMainRank = Number.POSITIVE_INFINITY;
  const mainKeySet = new Set<string>(MAIN_SCORE_PRIORITY as unknown as string[]);
  const skipStats = new Set<string>([
    "time",
    "state",
    "servis",
    "possession",
    "penalty_period",
    "half",
    "half2",
    "h1",
    "h2",
    "half1",
    "half2",
    "half_extra_time",
    "half2_extra_time",
    "extra_time",
    "over_time",
    "overtime",
  ]);

  for (const k in raw) {
    const v = raw[k];

    // main score candidate
    if (mainKeySet.has(k)) {
      const rank = MAIN_SCORE_PRIORITY.indexOf(k as MainKey);
      if (rank !== -1 && rank < bestMainRank && v && typeof v === "object") {
        const { home, away } = readHG(v);
        out.mainScore = { home: toNum(home), away: toNum(away), unit: k, sourceKey: k };
        bestMainRank = rank;
      }
      continue;
    }

    // indicator
    if (k === "servis" || k === "possession") {
      const { home, away } = readHG(v);
      const hb = toBool(home);
      const ab = toBool(away);
      let who: "home" | "away" | null = null;
      if (hb === true && ab !== true) who = "home";
      if (ab === true && hb !== true) who = "away";
      out.indicator = { type: k, who };
      continue;
    }

    // numbered segments q1/s2/p3/i9/m1/g5
    const pi = parsePrefixedIndex(k);
    if (pi) {
      const { home, away } = readHG(v);
      const hVal = toNum(home);
      const aVal = toNum(away);
      if (!(hVal === null && aVal === null)) {
        out.segments.push({
          type: segType(pi.prefix),
          index: pi.num,
          label: segLabel(pi.prefix, pi.num),
          home: hVal ?? home ?? null,
          away: aVal ?? away ?? null,
          sourceKey: k,
        });
      }
      continue;
    }

    // named half variants
    if (
      k === "half" ||
      k === "half2" ||
      k === "h1" ||
      k === "h2" ||
      k === "half1" ||
      k === "half2"
    ) {
      const { home, away } = readHG(v);
      const hVal = toNum(home);
      const aVal = toNum(away);
      if (!(hVal === null && aVal === null)) {
        out.segments.push({
          type: "half",
          index: k.endsWith("2") ? 2 : 1,
          label: k === "half" || k === "h1" || k === "half1" ? "H1" : "H2",
          home: hVal ?? home ?? null,
          away: aVal ?? away ?? null,
          sourceKey: k,
        });
      }
      continue;
    }

    // OT/ET/penalties score blocks
    if (
      k === "over_time" ||
      k === "overtime" ||
      k === "extra_time" ||
      k === "half_extra_time" ||
      k === "half2_extra_time" ||
      k === "penalties"
    ) {
      const { home, away } = readHG(v);
      const hVal = toNum(home);
      const aVal = toNum(away);
      if (!(hVal === null && aVal === null)) {
        out.segments.push({
          type: k.includes("extra_time")
            ? "extra_time"
            : k.includes("over")
              ? "overtime"
              : "penalties",
          index: null,
          label:
            k === "half_extra_time"
              ? "ET1"
              : k === "half2_extra_time"
                ? "ET2"
                : k.includes("over")
                  ? "OT"
                  : k === "penalties"
                    ? "PEN"
                    : "ET",
          home: hVal ?? home ?? null,
          away: aVal ?? away ?? null,
          sourceKey: k,
        });
      }
      continue;
    }

    // soccer penalty shootout nested score
    if (k === "penalty_period" && v?.score) {
      const { home, away } = readHG(v.score);
      const hVal = toNum(home);
      const aVal = toNum(away);
      if (!(hVal === null && aVal === null)) {
        out.segments.push({
          type: "penalties",
          index: null,
          label: "PEN",
          home: hVal ?? home ?? null,
          away: aVal ?? away ?? null,
          sourceKey: "penalty_period.score",
        });
      }
      continue;
    }

    // stats: any {h,g} object not already handled
    if (!skipStats.has(k) && v && typeof v === "object" && ("h" in v || "g" in v)) {
      const { home, away } = readHG(v);
      const hVal = toNum(home);
      const aVal = toNum(away);
      if (!(hVal === null && aVal === null)) out.stats[k] = { home: hVal, away: aVal };
    }
  }

  // sort segments by type then index (stable-ish, cheap)
  out.segments.sort((a, b) =>
    a.type === b.type ? (a.index ?? 999) - (b.index ?? 999) : a.type.localeCompare(b.type),
  );

  // fallback: derive score from segments if main missing
  if (out.mainScore.sourceKey === null && out.segments.length) {
    let sh = 0,
      sa = 0,
      hasAny = false;
    for (const s of out.segments) {
      if (typeof s.home === "number") {
        sh += s.home;
        hasAny = true;
      }
      if (typeof s.away === "number") {
        sa += s.away;
        hasAny = true;
      }
    }
    if (hasAny)
      out.mainScore = { home: sh, away: sa, unit: "derived_total", sourceKey: "segments_sum" };
  }

  return out;
}

// UI-friendly formatter
export function formatScore(raw: any) {
  const n = normalizeScoreboardFast(raw);
  const hs = n.mainScore.home ?? "-";
  const as = n.mainScore.away ?? "-";
  const unit = n.mainScore.unit.toUpperCase();
  const segs = n.segments
    .filter((s) => ["quarter", "set", "period", "inning", "map", "game", "half"].includes(s.type))
    .slice(0, 10)
    .map((s) => `${s.label} ${s.home ?? "-"}–${s.away ?? "-"}`)
    .join(", ");
  const phase = n.phase ? ` | ${n.phase}` : "";
  const clock = n.clock?.display ? ` ${n.clock.display}` : "";
  return {
    main: `${hs}–${as}`,
    sub: segs ? `${segs}${phase}` : ``,
  };
  // return `${hs}–${as} (${unit})${phase}${clock}${segs ? ` | ${segs}` : ""}`;
}
