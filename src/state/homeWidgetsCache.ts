import {
  apiGetStarPlayers,
  apiGetTrendingAccas,
  type StarPlayerCardResponse,
  type TrendingAccaCouponResponse,
} from "@/api/home/homeWidgets";
import { getAppConfig } from "@/shared/config/appConfig";
import { signal } from "@preact/signals";

export const starPlayersCache = signal<StarPlayerCardResponse[] | null>(null);
export const trendingAccasCache = signal<TrendingAccaCouponResponse[] | null>(
  null,
);

export type HomeWidgetsLoadOptions = {
  sportId?: number;
  starLimit?: number;
  accaLimit?: number;
};

const inFlight = new Map<string, Promise<void>>();

function inFlightKey(options?: HomeWidgetsLoadOptions): string {
  return JSON.stringify({
    sportId: options?.sportId ?? null,
    starLimit: options?.starLimit ?? 20,
    accaLimit: options?.accaLimit ?? 5,
  });
}

/** Loads both home widgets in parallel; concurrent calls with the same options share one request. */
export async function loadHomeWidgetsBatch(
  options?: HomeWidgetsLoadOptions,
): Promise<void> {
  const key = inFlightKey(options);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const { lang } = getAppConfig();
  const base = {
    lang: lang || "en",
    ...(options?.sportId != null ? { sportId: options.sportId } : {}),
  };

  const promise = (async () => {
    const [starRes, accaRes] = await Promise.all([
      apiGetStarPlayers({ ...base, limit: options?.starLimit ?? 20 }),
      apiGetTrendingAccas({ ...base, limit: options?.accaLimit ?? 5 }),
    ]);
    starPlayersCache.value = starRes?.data ?? [];
    trendingAccasCache.value = accaRes?.data ?? [];
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}
