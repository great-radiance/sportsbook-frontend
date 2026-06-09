import {
  apiGetHomeWidgets,
  type BetBuilderHighlightCardResponse,
  type NormalizedHomeWidgets,
  type StarPlayerCardResponse,
  type TrendingAccaCouponResponse,
} from "@/api/home/apiGetHomeWidget";
import { signal } from "@preact/signals";

export const homeWidgetsCache = signal<NormalizedHomeWidgets | null>(null);
export const starPlayersCache = signal<StarPlayerCardResponse[] | null>(null);
export const trendingAccasCache = signal<TrendingAccaCouponResponse[] | null>(
  null,
);
export const betBuilderHighlightsCache = signal<
  BetBuilderHighlightCardResponse[]
>([]);
export const betBuilderHighlightsSportId = signal<number | null>(null);

let loadPromise: Promise<void> | null = null;

function syncLegacySignals(data: NormalizedHomeWidgets) {
  homeWidgetsCache.value = data;
  starPlayersCache.value = data.starPlayers;
  trendingAccasCache.value = data.trendingAccas;
}

export async function loadHomeWidgetsBatch(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const data = await apiGetHomeWidgets();
    syncLegacySignals(data);

    const sportId = betBuilderHighlightsSportId.value;
    if (sportId != null) {
      betBuilderHighlightsCache.value = data.highlightBetBuilder.filter(
        (card) => card.sportId === sportId,
      );
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export async function loadBetBuilderHighlights(options: {
  sportId: number;
}): Promise<void> {
  if (!homeWidgetsCache.value) {
    await loadHomeWidgetsBatch();
  }
  betBuilderHighlightsCache.value = (
    homeWidgetsCache.value?.highlightBetBuilder ?? []
  ).filter((card) => card.sportId === options.sportId);
  betBuilderHighlightsSportId.value = options.sportId;
}
