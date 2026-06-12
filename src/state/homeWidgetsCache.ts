import {
  apiGetHomeWidgets,
  type BetBuilderHighlightCardResponse,
  type NormalizedHomeWidgets,
  type WidgetPickResponse,
} from "@/api/home/apiGetHomeWidget";
import { selectionStoreKey } from "@/state/storeState";
import { signal, Signal } from "@preact/signals";

export type HomeWidgetSelectionEntry = {
  id: number;
  eId: number;
  mId: number;
  etradingStatus: number;
  mtradingStatus: number;
  status: number;
  price: number;
  mv: number;
};

export const homeWidgetsCache = signal<NormalizedHomeWidgets | null>(null);
export const homeWidgetsSelectionsCache = signal<
  Record<string, Signal<HomeWidgetSelectionEntry>>
>({});
export const betBuilderHighlightsCache = signal<
  BetBuilderHighlightCardResponse[]
>([]);
export const betBuilderHighlightsSportId = signal<number | null>(null);

let loadPromise: Promise<void> | null = null;

function addPickToSelectionsCache(
  store: Record<string, Signal<HomeWidgetSelectionEntry>>,
  pick: WidgetPickResponse,
): void {
  if (!pick.eventId || !pick.marketId || !pick.selectionId) return;

  const key = selectionStoreKey(pick.eventId, pick.marketId, pick.selectionId);
  store[key] = signal<HomeWidgetSelectionEntry>({
    id: pick.selectionId,
    eId: pick.eventId,
    mId: pick.marketId,
    etradingStatus: 0,
    mtradingStatus: 0,
    status: 0,
    price: pick.odds,
    mv: 0,
  });
}

function syncHomeWidgetSelectionsCache(data: NormalizedHomeWidgets): void {
  const next: Record<string, Signal<HomeWidgetSelectionEntry>> = {};

  for (const card of data.starPlayers) {
    for (const pick of card.picks) addPickToSelectionsCache(next, pick);
  }
  for (const coupon of data.trendingAccas) {
    for (const leg of coupon.legs) addPickToSelectionsCache(next, leg);
  }
  for (const card of data.highlightBetBuilder) {
    for (const pick of card.picks) addPickToSelectionsCache(next, pick);
  }

  homeWidgetsSelectionsCache.value = next;
}

function syncLegacySignals(data: NormalizedHomeWidgets) {
  homeWidgetsCache.value = data;
  syncHomeWidgetSelectionsCache(data);
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
