import { competitor } from "@/types/typesForSocket.ts/tEventModel";

const HANDICAP_PARAM_KEYS = new Set(["hcp", "handicap", "hcp_for_the_rest"]);

function resolveHandicapRaw(
  parameters?: Record<string, string>,
  extraParameters?: Record<string, string>,
): string | undefined {
  const raw =
    extraParameters?.hcp_for_the_rest ??
    parameters?.hcp ??
    parameters?.handicap ??
    extraParameters?.hcp ??
    extraParameters?.handicap;
  return raw != null && raw !== "" ? String(raw) : undefined;
}

function applyHandicapPlaceholders(result: string, hcpRaw: string): string {
  const tokens = ["hcp", "handicap"] as const;

  if (hcpRaw.includes(":")) {
    for (const token of tokens) {
      result = result
        .replace(new RegExp(`\\{${token}\\}`, "g"), hcpRaw)
        .replace(new RegExp(`\\{\\+${token}\\}`, "g"), hcpRaw)
        .replace(new RegExp(`\\{-${token}\\}`, "g"), hcpRaw);
    }
    return result;
  }

  for (const token of tokens) {
    result = result.replace(new RegExp(`\\{${token}\\}`, "g"), hcpRaw);
  }

  const num = parseFloat(hcpRaw);
  if (Number.isNaN(num)) return result;

  for (const token of tokens) {
    if (num >= 0) {
      result = result
        .replace(new RegExp(`\\{\\+${token}\\}`, "g"), `+${hcpRaw}`)
        .replace(new RegExp(`\\{-${token}\\}`, "g"), `-${hcpRaw}`);
    } else {
      result = result
        .replace(new RegExp(`\\{\\+${token}\\}`, "g"), hcpRaw)
        .replace(new RegExp(`\\{-${token}\\}`, "g"), `+${Math.abs(num)}`);
    }
  }
  return result;
}

/** Feed keys like `AWAY_WIN_3+` → `Away Win 3+`. */
const FEED_MARKET_KEY_RE = /^[A-Za-z0-9_+\-.]+$/;

function formatSnakeWord(word: string): string {
  const lower = word.toLowerCase();
  if (!lower) return lower;
  const ord = lower.match(/^(\d+)([a-z]+)$/);
  if (ord) return `${ord[1]}${ord[2]}`;
  if (/^\d/.test(lower)) return lower;
  const alphaNum = lower.match(/^([a-z]+)(\d.*)$/);
  if (alphaNum) {
    return (
      alphaNum[1].charAt(0).toUpperCase() + alphaNum[1].slice(1) + alphaNum[2]
    );
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** `DOUBLE_CHANCE_HT_FT2` → `Double Chance Ht Ft2`; `AWAY_WIN_3+` → `Away Win 3+`. */
export function formatSnakeCaseMarketName(rawName: string): string {
  if (!rawName) return rawName;
  if (rawName.includes("{") || rawName.includes(" ")) return rawName;
  if (!rawName.includes("_")) return rawName;
  if (!FEED_MARKET_KEY_RE.test(rawName)) return rawName;

  return rawName.split("_").filter(Boolean).map(formatSnakeWord).join(" ");
}

/**
 * Replace placeholders in a market or selection name with concrete
 * values derived from the event's competitors and the market's
 * `parameters` / `extraParameters`.
 *
 * Supported placeholders (based on the feed):
 *   - {$competitor1}, {$competitor2}
 *       Team names from `competitors`. If `extraParameters.competitorId`
 *       is set, BOTH placeholders resolve to that single team
 *       (used by team-specific markets/selections).
 *   - {hcp}, {handicap}        Handicap line as-is (plain or "0:1" split).
 *   - {+hcp}, {+handicap}      Plus-side handicap display.
 *   - {-hcp}, {-handicap}      Minus-side handicap display.
 *       Value from `parameters.hcp`, `parameters.handicap`, or
 *       `extraParameters.hcp_for_the_rest`.
 *   - {total}      Total points/goals line.
 *   - Any other {key} or {!key} that matches a key in `parameters` or
 *     `extraParameters` (generic fallback for {goalnr}, {variant}, ...).
 *
 * If the input has no placeholders, snake_case keys are title-cased (`_` → space).
 */
export const completeName = (
  rawName: string,
  competitors?: competitor[],
  parameters?: Record<string, string>,
  extraParameters?: Record<string, string>,
): string => {
  if (!rawName) return rawName;
  if (!rawName.includes("{")) return formatSnakeCaseMarketName(rawName);

  const list = competitors ?? [];
  let competitor1 = list[0]?.name ?? "";
  let competitor2 = list[1]?.name ?? "";

  const cidStr = extraParameters?.competitorId;
  if (cidStr) {
    const cid = Number(cidStr);
    const team = list.find((c) => c.id === cid);
    if (team) {
      competitor1 = team.name;
      competitor2 = team.name;
    }
  }

  let result = rawName
    .replace(/\{\$competitor1\}/g, competitor1)
    .replace(/\{\$competitor2\}/g, competitor2);

  const hcpRaw = resolveHandicapRaw(parameters, extraParameters);
  if (hcpRaw !== undefined) {
    result = applyHandicapPlaceholders(result, hcpRaw);
  }

  const merged: Record<string, string> = {
    ...(parameters ?? {}),
    ...(extraParameters ?? {}),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (val == null) continue;
    if (key === "competitorId" || HANDICAP_PARAM_KEYS.has(key)) {
      continue;
    }
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{!?${safeKey}\\}`, "g");
    result = result.replace(re, val);
  }

  return formatSnakeCaseMarketName(result);
};

const DRAW_NICK = "X";
const OR_SEPARATOR_RE = /\s+or\s+/i;

function isDrawLabel(text: string): boolean {
  return text.trim().toLowerCase() === "draw";
}

function resolvePlaceholderCompetitorNicks(
  competitors: competitor[],
  extraParameters?: Record<string, string>,
): { competitor1: string; competitor2: string } {
  let competitor1 = "1";
  let competitor2 = "2";

  const cidStr = extraParameters?.competitorId;
  if (!cidStr) return { competitor1, competitor2 };

  const cid = Number(cidStr);
  const idx = competitors.findIndex((c) => c.id === cid);
  if (idx < 0) return { competitor1, competitor2 };

  const nick = String(idx + 1);
  return { competitor1: nick, competitor2: nick };
}

function resolveCompetitorNickToken(
  part: string,
  homeName: string,
  awayName: string,
): string | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  if (isDrawLabel(trimmed)) return DRAW_NICK;
  if (trimmed === "1" || trimmed === "2" || trimmed === DRAW_NICK) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (homeName && lower === homeName.trim().toLowerCase()) return "1";
  if (awayName && lower === awayName.trim().toLowerCase()) return "2";

  return null;
}

/**
 * Map translated selection labels (team names, draw, double-chance combos)
 * to compact 1 / 2 / X notation.
 */
function nickNameFromCompetitorText(
  rawName: string,
  competitors: competitor[],
): string | null {
  if (!competitors.length) return null;

  const homeName = competitors[0]?.name ?? "";
  const awayName = competitors[1]?.name ?? "";
  const trimmed = rawName.trim();
  if (!trimmed) return null;

  if (OR_SEPARATOR_RE.test(trimmed)) {
    const parts = trimmed
      .split(OR_SEPARATOR_RE)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) return null;

    const tokens = parts.map((part) =>
      resolveCompetitorNickToken(part, homeName, awayName),
    );
    if (tokens.some((token) => token === null)) return null;
    return tokens.join("");
  }

  return resolveCompetitorNickToken(trimmed, homeName, awayName);
}

export const completeNickName = (
  rawName: string,
  competitors?: competitor[],
  parameters?: Record<string, string>,
  extraParameters?: Record<string, string>,
): string => {
  if (!rawName) return rawName;

  const list = competitors ?? [];

  if (!rawName.includes("{")) {
    const fromCompetitors = nickNameFromCompetitorText(rawName, list);
    if (fromCompetitors != null) return fromCompetitors;
    if (isDrawLabel(rawName)) return DRAW_NICK;
    return formatSnakeCaseMarketName(rawName);
  }

  const { competitor1, competitor2 } = resolvePlaceholderCompetitorNicks(
    list,
    extraParameters,
  );

  let result = rawName
    .replace(/\{\$competitor1\}/g, competitor1)
    .replace(/\{\$competitor2\}/g, competitor2)
    .replace(/\{!?draw\}/gi, DRAW_NICK);

  const hcpRaw = resolveHandicapRaw(parameters, extraParameters);
  if (hcpRaw !== undefined) {
    result = applyHandicapPlaceholders(result, hcpRaw);
  }

  const merged: Record<string, string> = {
    ...(parameters ?? {}),
    ...(extraParameters ?? {}),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (val == null) continue;
    if (key === "competitorId" || HANDICAP_PARAM_KEYS.has(key)) {
      continue;
    }
    const replacement = key.toLowerCase() === "draw" ? DRAW_NICK : val;
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{!?${safeKey}\\}`, "gi");
    result = result.replace(re, replacement);
  }

  const fromCompetitors = nickNameFromCompetitorText(result, list);
  if (fromCompetitors != null) return fromCompetitors;
  if (isDrawLabel(result)) return DRAW_NICK;

  return formatSnakeCaseMarketName(result);
};
