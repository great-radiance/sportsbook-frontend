import {
  apiGetHomeWidgets,
  type NormalizedHomeWidgets,
  type WidgetPickResponse,
} from "@/api/home/apiGetHomeWidget";
import { signal, Signal } from "@preact/signals";
import {
  sportsbookStore,
  selectionStoreKey,
  type HomeWidgetSelectionEntry,
  type OddsChangedLine,
} from "./sportsbookStoreContext";

export type { HomeWidgetSelectionEntry, OddsChangedLine };

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

  sportsbookStore.homeWidgetsSelectionsCache.value = next;
}

function syncLegacySignals(data: NormalizedHomeWidgets): void {
  sportsbookStore.homeWidgetsCache.value = data;
  syncHomeWidgetSelectionsCache(data);
}

export function requestBetHistoryRefresh(): void {
  sportsbookStore.betHistoryRefreshNonce.value += 1;
}

export function refreshHomeWidgets(): void {
  sportsbookStore.homeWidgetsRefreshNonce.value += 1;
}

export function showOddsChangedDialog(
  lines: OddsChangedLine[],
  message?: string,
): void {
  sportsbookStore.oddsChangedDialogLines.value = lines;
  if (message) sportsbookStore.oddsChangedDialogMessage.value = message;
  sportsbookStore.oddsChangedDialogOpen.value = true;
}

export function closeOddsChangedDialog(): void {
  sportsbookStore.oddsChangedDialogOpen.value = false;
  sportsbookStore.oddsChangedDialogLines.value = [];
}

function normalizeTeamNameForLogo(team: string): string {
  if (!team) return "";
  return team
    .replace(/\s*\(?u(?:\s|-)?(?:1[0-9]|2[0-9])\)?$/i, "")
    .replace(/\s*youth$/i, "")
    .replace(/\s*\(w\)\s*$/i, "")
    .trim();
}

/** Cached logo URL when something has populated `teamlogosState` (no remote logo API). */
export function cachedTeamLogoUrl(
  sport: string | undefined,
  team: string,
): string | null {
  if (!sport || !team) return null;
  const normalizedTeam = normalizeTeamNameForLogo(team);
  const map = sportsbookStore.teamlogosState.value[sport];
  return map?.[team] ?? map?.[normalizedTeam] ?? null;
}

export async function loadHomeWidgetsBatch(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const data = await apiGetHomeWidgets();
    syncLegacySignals(data);

    const sportId = sportsbookStore.betBuilderHighlightsSportId.value;
    if (sportId != null) {
      sportsbookStore.betBuilderHighlightsCache.value =
        data.highlightBetBuilder.filter((card) => card.sportId === sportId);
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export async function loadBetBuilderHighlights(options: {
  sportId: number;
}): Promise<void> {
  if (!sportsbookStore.homeWidgetsCache.value) {
    await loadHomeWidgetsBatch();
  }
  sportsbookStore.betBuilderHighlightsCache.value = (
    sportsbookStore.homeWidgetsCache.value?.highlightBetBuilder ?? []
  ).filter((card) => card.sportId === options.sportId);
  sportsbookStore.betBuilderHighlightsSportId.value = options.sportId;
}
