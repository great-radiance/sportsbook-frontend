import { Live } from "@/shared/utils/types";
import { selectionsStoreState, storeState } from "@/state/storeState";
import { tEvent } from "@/types/tEvent";
import {
  tEventModel,
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import { signal, Signal } from "@preact/signals";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { completeName } from "./completeName";

export const storeEvent = (event: MatchDataResponse) => {
  if (!event) return;
  console.log("event for storeEvent", event);
  if (!storeState.value[event.eventInfo.id]) {
    storeState.value[event.eventInfo.id] = signal<tEventModel>(
      {} as tEventModel,
    );
  }
  const competitors = event.eventInfo.competitors ?? [];
  const marketsRecord: Record<string, Signal<tMarketModel>> = {};
  console.log("event.markets", event.markets);
  for (const market of event.markets ?? []) {
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
    console.log("market", market);
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
      isBetBuilderSuported: market.isBetBuilderSuported,
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
    isBetBuilderSuported: event.eventInfo.isBetBuilderSuported,
    mappingInfo: event.eventInfo.mappingInfo,
    markets: {
      ...evSig.value.markets,
      ...marketsRecord,
    },
    scoreboard: event.scoreboard,
    // live: (event.scoreboard ?? ({} as ScoreBoard)) as ScoreBoard,
  } as tEventModel;
  console.log("event.marketrecord", marketsRecord);
  console.log("storedEvent", storeState.value[event.eventInfo.id]);
};

export const storeSelection = (
  eventId: number,
  marketId: string,
  selectionId: number,
) => {
  if (!eventId || !marketId || !selectionId) return;
  const selectionSig = storeState.value[eventId]?.value.markets?.[
    marketId
  ]?.value.selections?.find((selection) => selection.value.id === selectionId);
  selectionsStoreState.value = {
    ...selectionsStoreState.value,
    [selectionId]: signal({
      eId: eventId,
      mId: marketId,
      id: selectionId,
      price:
        selectionSig &&
        typeof selectionSig === "object" &&
        "value" in selectionSig
          ? selectionSig.value.price
          : 1,
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
