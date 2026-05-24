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

/** Loads both home widgets in parallel (integration guide). */
export async function loadHomeWidgetsBatch(
  options?: HomeWidgetsLoadOptions,
): Promise<void> {
  const { lang } = getAppConfig();
  const base = {
    lang: lang || "en",
    ...(options?.sportId != null ? { sportId: options.sportId } : {}),
  };

  const [starRes, accaRes] = await Promise.all([
    apiGetStarPlayers({ ...base, limit: options?.starLimit ?? 20 }),
    apiGetTrendingAccas({ ...base, limit: options?.accaLimit ?? 3 }),
  ]);

  starPlayersCache.value = starRes?.data ?? [];
  trendingAccasCache.value = accaRes?.data ?? [];
}
