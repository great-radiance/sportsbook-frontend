import { getOddsValue } from "@/helpers/getOddsValue";
import { refreshHomeWidgets } from "@/state/homeWidgetsRefresh";
import {
  loadHomeWidgetsBatch,
  starPlayersCache,
  trendingAccasCache,
} from "@/state/homeWidgetsCache";
import {
  showOddsChangedDialog,
  type OddsChangedLine,
} from "@/state/oddsChangedDialogState";

export type SubmittedSelectionLine = {
  label: string;
  eventId: number;
  marketId: number;
  selectionId: number;
  odds: number;
};

/** Integration guide: re-fetch widgets and show old vs new prices. */
export function onBetRejectedWithReason(reason: string | undefined): void {
  if (reason === "ODDS_CHANGED") {
    refreshHomeWidgets();
  }
}

export async function handleOddsChangedRejection(
  submitted: SubmittedSelectionLine[],
): Promise<void> {
  refreshHomeWidgets();
  await loadHomeWidgetsBatch();

  const eventIds = new Set(submitted.map((s) => s.eventId));
  const lines: OddsChangedLine[] = submitted.map((s) => ({
    label: s.label,
    oldOdds: s.odds,
    newOdds: s.odds,
  }));

  for (const card of starPlayersCache.value ?? []) {
    if (!eventIds.has(card.eventId)) continue;
    for (const pick of card.picks) {
      const line = lines.find((l) =>
        submitted.some(
          (s) =>
            s.eventId === pick.eventId && s.selectionId === pick.selectionId,
        ),
      );
      if (line) line.newOdds = pick.odds;
    }
  }

  for (const coupon of trendingAccasCache.value ?? []) {
    for (const leg of coupon.legs) {
      if (!eventIds.has(leg.eventId)) continue;
      const line = lines.find((l) =>
        submitted.some(
          (s) =>
            s.eventId === leg.eventId && s.selectionId === leg.selectionId,
        ),
      );
      if (line) line.newOdds = leg.odds;
    }
  }

  for (let i = 0; i < submitted.length; i++) {
    const s = submitted[i];
    const fromStore = getOddsValue(
      s.eventId,
      String(s.marketId),
      String(s.selectionId),
    );
    if (fromStore > 0 && Math.abs(fromStore - s.odds) > 0.001) {
      lines[i].newOdds = fromStore;
    }
  }

  const changed = lines.filter(
    (l) => Math.abs(l.oldOdds - l.newOdds) > 0.001,
  );

  showOddsChangedDialog(
    changed.length > 0 ? changed : lines,
    changed.length === 0
      ? "This market may no longer be available. Please review your bet slip."
      : undefined,
  );
}
