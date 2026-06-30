import { apiGetMaxBet } from "@/api/bet/apiGetMaxbet";
import { hasPlayerSessionUserId } from "@/api/instance";
import type { PlaceBetSelectionPayload } from "@/api/bet/placeBet";

export function parseMaxBetResponse(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const data =
    "data" in body && (body as { data: unknown }).data != null
      ? (body as { data: unknown }).data
      : body;
  if (!data || typeof data !== "object") return null;
  const candidate =
    (data as { maxBet?: unknown }).maxBet ??
    (data as { maxStake?: unknown }).maxStake;
  if (
    typeof candidate === "number" &&
    Number.isFinite(candidate) &&
    candidate >= 0
  ) {
    return candidate;
  }
  return null;
}

export function effectiveMaxStake(
  apiMax: number | null | undefined,
  limitMax: number | undefined,
): number | undefined {
  const values = [apiMax, limitMax].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (values.length === 0) return undefined;
  return Math.min(...values);
}

export function clampStake(
  value: number,
  apiMax: number | null | undefined,
  limitMax: number | undefined,
): number {
  const max = effectiveMaxStake(apiMax, limitMax);
  if (max == null) return Math.max(0, value);
  return Math.max(0, Math.min(value, max));
}

export async function fetchMaxBetStake(
  betType: "single" | "parlay",
  selections: PlaceBetSelectionPayload[],
  currency: string,
): Promise<number | null> {
  if (!hasPlayerSessionUserId() || selections.length === 0) return null;
  try {
    const body = await apiGetMaxBet({ betType, currency, selections });
    return parseMaxBetResponse(body);
  } catch {
    return null;
  }
}
