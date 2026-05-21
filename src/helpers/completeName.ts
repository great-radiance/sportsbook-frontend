import { competitor } from "@/types/typesForSocket.ts/tEventModel";

const HANDICAP_PARAM_KEYS = new Set([
  "hcp",
  "handicap",
  "hcp_for_the_rest",
]);

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
 * If the input has no placeholders, it is returned unchanged.
 */
export const completeName = (
  rawName: string,
  competitors?: competitor[],
  parameters?: Record<string, string>,
  extraParameters?: Record<string, string>,
): string => {
  if (!rawName || !rawName.includes("{")) return rawName;

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

  return result;
};
