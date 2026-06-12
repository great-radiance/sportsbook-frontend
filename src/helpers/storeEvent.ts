import { Live } from "@/shared/utils/types";
import {
  selectionStoreKey,
  selectionsStoreState,
  storeState,
} from "@/state/storeState";
import { tEvent } from "@/types/tEvent";
import {
  tEventModel,
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { signal, Signal } from "@preact/signals";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { completeName, completeNickName } from "./completeName";
import { computePriceMv } from "@/helpers/odds88/priceMove";

/** API payloads may use legacy typo `isBetBuilderSuported` or correct `isBetBuilderSupported`. */
type BetBuilderSupportIn = {
  isBetBuilderSupported?: boolean;
  isBetBuilderSuported?: boolean;
};

function readIsBetBuilderSupported(source: BetBuilderSupportIn): boolean {
  return Boolean(source.isBetBuilderSupported ?? source.isBetBuilderSuported);
}

export const storeEvent = (event: MatchDataResponse) => {
  if (!event) return;
  // if (
  //   new Date(event.eventInfo.startTime).getTime() <
  //   Date.now() - 1000 * 60 * 60 * 24
  // )
  //   return;
  const eventExists = storeState.value[event.eventInfo.id] ? true : false;
  if (!eventExists) {
    storeState.value[event.eventInfo.id] = signal<tEventModel>(
      {} as tEventModel,
    );
  }
  const competitors = event.eventInfo.competitors ?? [];
  const marketsRecord: Record<number, Signal<tMarketModel>> = {};
  for (const market of event.markets ?? []) {
    const existingSelections =
      storeState.value[event.eventInfo.id]?.value.markets?.[market.id]?.value
        .selections ?? [];
    const selections: Signal<tSelectionValue>[] = [];
    for (const selection of market.selections ?? []) {
      const selectionExtra = {
        ...(market.extraParameters ?? {}),
        ...(selection.extraParameters ?? {}),
      };
      const completedSelection: tSelectionValue = {
        ...selection,
        name: completeName(
          selection.name,
          competitors,
          market.parameters,
          selectionExtra,
        ),
        nickName: completeNickName(
          selection.name,
          competitors,
          market.parameters,
          selectionExtra,
        ),
        mv: existingSelections.find((s) => s.value.id === selection.id)
          ? computePriceMv(
              existingSelections.find((s) => s.value.id === selection.id)?.value
                .originalPrice ?? 0,
              selection.price,
            )
          : 0,
        // mv: (() => {
        //   const existingSelection = existingSelections.find(
        //     (s) => s.value.id === selection.id,
        //   );
        //   // console.log("existingSelection", existingSelection);
        //   // console.log("selection", selection);
        //   console.log(
        //     "computePriceMv",
        //     computePriceMv(
        //       existingSelection?.value.price ?? 0,
        //       selection.price,
        //     ),
        //   );
        //   return existingSelection
        //     ? computePriceMv(
        //         existingSelection?.value.price ?? 0,
        //         selection.price,
        //       )
        //     : 0;
        // })(),
        isBetBuilderSupported: readIsBetBuilderSupported(
          selection as BetBuilderSupportIn,
        ),
      };
      selections.push(signal<tSelectionValue>(completedSelection));
    }
    // odds.oddIdList.sort((a, b) => {
    //   const oddA = odds[a];
    //   const oddB = odds[b];
    //   const hA = Array.isArray(oddA)
    //     ? "0"
    //     : (oddA?.value?.properties?.h ?? "0");
    //   const hB = Array.isArray(oddB)
    //     ? "0"
    //     : (oddB?.value?.properties?.h ?? "0");
    //   return parseFloat(hA) - parseFloat(hB);
    // });
    const marketData: tMarketModel = {
      id: market.id,
      name: completeName(
        market.name,
        competitors,
        market.parameters,
        market.extraParameters,
      ),
      tradingStatus: market.tradingStatus,
      type: market.type,
      isBestLine: market.isBestLine,
      parameters: market.parameters,
      extraParameters: market.extraParameters,
      isBetBuilderSupported: readIsBetBuilderSupported(
        market as BetBuilderSupportIn,
      ),
      selections: selections.sort((a, b) => a.value.id - b.value.id),
    };
    if (
      market.tradingStatus === 0 ||
      market.tradingStatus === 1
      // market.tradingStatus === 2 ||
      // market.tradingStatus === 3
    ) {
      marketsRecord[market.id] = signal(marketData);
    }
  }
  const evSig = storeState.value[event.eventInfo.id];

  evSig.value = {
    id: event.eventInfo.id,
    name: event.eventInfo.name,
    status: event.eventInfo.status,
    tradingStatus: event.eventInfo.tradingStatus,
    statusDescription: event.eventInfo.statusDescription,
    sport: event.eventInfo.sport,
    region: event.eventInfo.country,
    league: event.eventInfo.competition,
    season: event.eventInfo.season,
    competitors: event.eventInfo.competitors,
    startTime: event.eventInfo.startTime,
    isOutright: event.eventInfo.isOutright,
    customdisplayData: event.eventInfo.customDisplayData,
    isBetBuilderSupported: readIsBetBuilderSupported(
      event.eventInfo as BetBuilderSupportIn,
    ),
    mappingInfo: event.eventInfo.mappingInfo,
    markets: {
      ...evSig.value.markets,
      ...marketsRecord,
    },
    marketRef: event.marketRef?.length
      ? event.marketRef
      : evSig.value.marketRef,
    scoreboard: event.scoreboard ?? null,
    // // live: (event.scoreboard ?? ({} as ScoreBoard)) as ScoreBoard,
  } as tEventModel;
  syncSelectionsStoreForEvent(event.eventInfo.id);
};
type SelectionStoreEntry = {
  id: number;
  eId: number;
  mId: number;
  etradingStatus: number;
  mtradingStatus: number;
  status: number;
  price: number;
  mv: number;
};

/** Push live odds from `storeState` into betslip/widget selection cache. */
export function syncSelectionsStoreForEvent(eventId: number): void {
  const ev = storeState.value[eventId]?.value;
  if (!ev) return;

  const store = selectionsStoreState.value;
  for (const key in store) {
    const sig = store[key];
    const entry = sig?.value;
    if (!entry || entry.eId !== eventId) continue;

    const marketSig = ev.markets?.[entry.mId];
    const selSig = marketSig?.value.selections?.find(
      (s) => s.value.id === entry.id,
    );
    if (!selSig) continue;

    const sel = selSig.value;
    const next: SelectionStoreEntry = {
      ...entry,
      price: sel.price,
      mv: sel.mv ?? 0,
      status: sel.status ?? entry.status,
      mtradingStatus: marketSig?.value.tradingStatus ?? entry.mtradingStatus,
      etradingStatus: ev.tradingStatus ?? entry.etradingStatus,
    };
    if (
      next.price !== entry.price ||
      next.mv !== entry.mv ||
      next.status !== entry.status ||
      next.mtradingStatus !== entry.mtradingStatus ||
      next.etradingStatus !== entry.etradingStatus
    ) {
      sig.value = next;
    }
  }
}

type IncomingWsSelection = {
  id: number;
  price: number;
  originalPrice?: number;
  status?: number;
};

type IncomingWsMarket = {
  id: number;
  tradingStatus: number;
  selections?: IncomingWsSelection[];
};

/**
 * Update tracked selections from WS market payload when the event is not in `storeState`
 * (e.g. widget pick still on the slip).
 */
export function syncSelectionsStoreFromIncomingMarkets(
  eventId: number,
  markets: IncomingWsMarket[],
  eventTradingStatus?: number,
): void {
  const store = selectionsStoreState.value;
  for (const market of markets) {
    for (const sel of market.selections ?? []) {
      const key = selectionStoreKey(eventId, market.id, sel.id);
      const sig = store[key];
      if (!sig) continue;

      const entry = sig.value;
      const nextPrice = Number(sel.price);
      const feedPrev = Number(sel.originalPrice);
      const basePrice =
        Number.isFinite(feedPrev) && feedPrev > 0 && feedPrev !== nextPrice
          ? feedPrev
          : entry.price;
      const mv = computePriceMv(basePrice, nextPrice);

      sig.value = {
        ...entry,
        price: nextPrice,
        mv,
        status: sel.status ?? entry.status,
        mtradingStatus: market.tradingStatus,
        etradingStatus: eventTradingStatus ?? entry.etradingStatus,
      };
    }
  }
}

export const storeSelection = (
  eventId: number,
  marketId: number,
  selectionId: number,
) => {
  if (!eventId || !marketId || !selectionId) return;
  const selectionSig = storeState.value[eventId]?.value.markets?.[
    marketId
  ]?.value.selections?.find((selection) => selection.value.id === selectionId);
  const key = selectionStoreKey(eventId, marketId, selectionId);
  const existing = selectionsStoreState.value[key]?.value;
  const livePrice =
    selectionSig && typeof selectionSig === "object" && "value" in selectionSig
      ? selectionSig.value.price
      : undefined;

  selectionsStoreState.value = {
    ...selectionsStoreState.value,
    [key]: signal({
      eId: eventId,
      mId:
        storeState.value[eventId]?.value.markets?.[marketId]?.value.id ??
        marketId,
      id: selectionId,
      price: livePrice ?? existing?.price ?? 1,
      etradingStatus:
        storeState.value[eventId]?.value.tradingStatus ??
        existing?.etradingStatus ??
        0,
      mtradingStatus:
        storeState.value[eventId]?.value.markets?.[marketId]?.value
          .tradingStatus ??
        existing?.mtradingStatus ??
        0,
      status: selectionSig?.value.status ?? existing?.status ?? 0,
      mv:
        selectionSig &&
        typeof selectionSig === "object" &&
        "value" in selectionSig
          ? (selectionSig.value.mv ?? 0)
          : (existing?.mv ?? 0),
    }),
  };
  // console.log("storedEvent", selectionsStoreState.value);
};

export const removeFromOddsStore = (ids: string[]) => {
  if (!ids.length) return;
  const next = { ...selectionsStoreState.value };
  for (const id of ids) delete next[id];
  selectionsStoreState.value = next;
};

// export const filterOddsByEventMarket = (eventId: number, marketId: string) => {
//   if (!eventId || !marketId) return;
//   // const filteredOdds: Record<string, Signal<tBetOddsModel>> = {};
//   for (const oddId in oddsStoreState.value) {
//     const odd = oddsStoreState.value[oddId];
//     if (odd.eId !== eventId && odd.mId !== marketId) {
//       delete oddsStoreState.value[oddId];
//     }
//   }
// };

// export const storeOdd = (eventId: number, marketId: string, oddId: string) => {
//   if (!eventId || !marketId || !oddId) return;
//   if (!oddsStoreState.value[eventId]) {
//     oddsStoreState.value[eventId] = signal({} as tBetEventModel);
//   }
//   if (!oddsStoreState.value[eventId].value[marketId]) {
//     oddsStoreState.value[eventId].value[marketId] = signal(
//       {} as tBetMarketModel,
//     );
//   }
//   const oddSig = storeState.value[eventId]?.value.markets?.[marketId]?.value
//     .odds?.[oddId] as
//     | Signal<{ status: string; value: number; mv: number }>
//     | undefined;
//   const oddVal = oddSig?.value;
//   oddsStoreState.value[eventId].value[marketId] = signal({
//     mStatus: signal(
//       storeState.value[eventId]?.value.markets?.[marketId]?.value.status ?? "",
//     ),
//     [oddId]: signal({
//       status: oddVal?.status ?? "",
//       value: oddVal?.value ?? 1,
//       mv: oddVal?.mv ?? 0,
//     } as tBetOddsModel),
//   });
// };
