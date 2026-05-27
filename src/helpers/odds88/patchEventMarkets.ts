import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { completeName } from "@/helpers/completeName";
import { syncSelectionsStoreForEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import type {
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { signal, type Signal } from "@preact/signals";
import { computePriceMv } from "./priceMove";

type BetBuilderSupportIn = {
  isBetBuilderSupported?: boolean;
  isBetBuilderSuported?: boolean;
};

function readIsBetBuilderSupported(source: BetBuilderSupportIn): boolean {
  return Boolean(source.isBetBuilderSupported ?? source.isBetBuilderSuported);
}

/** Update markets/selections in-place on an event already in `storeState`; sets `mv` on price change. */
export function patchEventMarkets(event: MatchDataResponse): void {
  const eventId = event.eventInfo?.id;
  if (!eventId) return;

  const evSig = storeState.value[eventId];
  if (!evSig?.value?.id) return;

  const competitors = event.eventInfo.competitors?.length
    ? event.eventInfo.competitors
    : (evSig.value.competitors ?? []);
  let touched = false;

  for (const market of event.markets ?? []) {
    const mKey = market.id;
    const marketSig = evSig.value.markets?.[mKey];

    if (!marketSig) {
      if (market.tradingStatus !== 0 && market.tradingStatus !== 1) continue;

      const newSelections: Signal<tSelectionValue>[] = [];
      for (const selection of market.selections ?? []) {
        const selectionExtra = {
          ...(market.extraParameters ?? {}),
          ...(selection.extraParameters ?? {}),
        };
        newSelections.push(
          signal({
            ...selection,
            price: Number(selection.price),
            name: completeName(
              selection.name,
              competitors,
              market.parameters,
              selectionExtra,
            ),
            mv: 0,
            isBetBuilderSupported: readIsBetBuilderSupported(
              selection as BetBuilderSupportIn,
            ),
          }),
        );
      }

      const marketData: tMarketModel = {
        id: market.id,
        name: market.name,
        tradingStatus: market.tradingStatus,
        type: market.type,
        isBestLine: market.isBestLine,
        parameters: market.parameters,
        extraParameters: market.extraParameters,
        isBetBuilderSupported: readIsBetBuilderSupported(
          market as BetBuilderSupportIn,
        ),
        selections: newSelections.sort((a, b) => a.value.id - b.value.id),
      };

      evSig.value = {
        ...evSig.value,
        markets: {
          ...evSig.value.markets,
          [mKey]: signal(marketData),
        },
      };
      touched = true;
      continue;
    }

    const existingById = new Map(
      marketSig.value.selections.map((s) => [s.value.id, s]),
    );

    for (const incoming of market.selections ?? []) {
      const selectionExtra = {
        ...(market.extraParameters ?? {}),
        ...(incoming.extraParameters ?? {}),
      };
      const name = completeName(
        incoming.name,
        competitors,
        market.parameters,
        selectionExtra,
      );
      const sig = existingById.get(incoming.id);
      const nextPrice = Number(incoming.price);

      if (sig) {
        const prevPrice = Number(sig.value.price);
        const feedPrev = Number(incoming.originalPrice);
        const basePrice =
          Number.isFinite(feedPrev) && feedPrev > 0 && feedPrev !== nextPrice
            ? feedPrev
            : prevPrice;
        const mv = computePriceMv(basePrice, nextPrice);
        sig.value = {
          ...sig.value,
          ...incoming,
          price: nextPrice,
          name,
          mv,
          isBetBuilderSupported: readIsBetBuilderSupported(
            incoming as BetBuilderSupportIn,
          ),
        };
        touched = true;
      } else {
        const created: tSelectionValue = {
          ...incoming,
          price: nextPrice,
          name,
          mv: 0,
          isBetBuilderSupported: readIsBetBuilderSupported(
            incoming as BetBuilderSupportIn,
          ),
        };
        marketSig.value = {
          ...marketSig.value,
          selections: [...marketSig.value.selections, signal(created)].sort(
            (a, b) => a.value.id - b.value.id,
          ),
        };
        touched = true;
      }
    }

    marketSig.value = {
      ...marketSig.value,
      tradingStatus: market.tradingStatus,
      name: market.name,
      parameters: market.parameters,
      extraParameters: market.extraParameters,
    };
    touched = true;
  }

  if (event.marketsRef?.length) {
    evSig.value = { ...evSig.value, marketsRef: event.marketsRef };
    touched = true;
  }

  if (event.scoreboard != null) {
    evSig.value = { ...evSig.value, scoreboard: event.scoreboard };
    touched = true;
  } else if (touched) {
    evSig.value = { ...evSig.value };
  }

  syncSelectionsStoreForEvent(eventId);
}
