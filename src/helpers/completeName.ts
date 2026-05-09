import { competitor } from "@/types/typesForSocket.ts/tEventModel";

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
 *   - {hcp}        Handicap value as-is. Supports plain (e.g. "0.5",
 *                  "-0.25") and split formats (e.g. "0:1").
 *   - {+hcp}       Handicap shown for the "plus" side. Positive values
 *                  get a leading "+", negative values stay as-is.
 *   - {-hcp}       Handicap shown for the "minus" side. Positive values
 *                  get a leading "-", negative values flip to positive.
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

  const hcpRaw = extraParameters?.hcp_for_the_rest ?? parameters?.hcp;
  if (hcpRaw !== undefined) {
    if (hcpRaw.includes(":")) {
      result = result
        .replace(/\{hcp\}/g, hcpRaw)
        .replace(/\{\+hcp\}/g, hcpRaw)
        .replace(/\{-hcp\}/g, hcpRaw);
    } else {
      result = result.replace(/\{hcp\}/g, hcpRaw);
      const num = parseFloat(hcpRaw);
      if (!Number.isNaN(num)) {
        if (num >= 0) {
          result = result
            .replace(/\{\+hcp\}/g, `+${hcpRaw}`)
            .replace(/\{-hcp\}/g, `-${hcpRaw}`);
        } else {
          result = result
            .replace(/\{\+hcp\}/g, hcpRaw)
            .replace(/\{-hcp\}/g, `+${Math.abs(num)}`);
        }
      }
    }
  }

  const merged: Record<string, string> = {
    ...(parameters ?? {}),
    ...(extraParameters ?? {}),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (val == null) continue;
    if (key === "competitorId" || key === "hcp_for_the_rest" || key === "hcp") {
      continue;
    }
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{!?${safeKey}\\}`, "g");
    result = result.replace(re, val);
  }

  return result;
};
