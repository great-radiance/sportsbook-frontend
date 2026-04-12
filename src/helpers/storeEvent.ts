import { Live } from "@/shared/utils/types";
import { oddsStoreState, storeState } from "@/state/storeState";
import { tEvent } from "@/types/tEvent";
import {
  tEventModel,
  tMarketModel,
  tOddValue,
  tOddsModel,
} from "@/types/typesForSocket.ts/tEventModel";
import { signal, Signal } from "@preact/signals";

export const storeEvent = (event: tEvent) => {
  if (!event) return;
  if (!storeState.value[event.id]) {
    storeState.value[event.id] = signal<tEventModel>({} as tEventModel);
  }
  const marketsRecord: Record<string, Signal<tMarketModel>> = {};
  for (const market of event.markets ?? []) {
    const odds: tOddsModel = { oddIdList: [], odds: {} };
    for (const odd of market.odds ?? []) {
      odds.oddIdList.push(odd.id);
      odds.odds[odd.id] = signal<tOddValue>({
        id: odd.id,
        value: odd.value,
        impliedOdd: odd.impliedOdd,
        status: odd.status,
        mv: odd.mv,
        column: odd.column,
        sort: odd.sort,
        name: odd.name,
      });
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
      status: market.status,
      name: market.name,
      column: market.column,
      groups: market.groups,
      sort: market.sort,
      odds,
    };
    marketsRecord[market.id] = signal(marketData);
  }
  const evSig = storeState.value[event.id];

  evSig.value = {
    id: event.id,
    sport: evSig.value.sport || event.sport || "",
    region: evSig.value.region || event.region || "",
    league: evSig.value.league || event.league || "",
    participants: event.participants ?? [],
    startDate: event.startDate ?? 0,
    status: event.status ?? "",
    sportRadarId: String(event.sportRadarId ?? ""),
    outright: event.outright ?? false,
    markets: {
      ...evSig.value.markets,
      ...marketsRecord,
    },
    live: (event.live ?? ({} as Live)) as Live,
  } as tEventModel;
};

export const storeOdd = (eventId: number, marketId: string, oddId: string) => {
  if (!eventId || !marketId || !oddId) return;
  const oddSig =
    storeState.value[eventId]?.value.markets?.[marketId]?.value.odds?.odds?.[
      oddId
    ];
  oddsStoreState.value = {
    ...oddsStoreState.value,
    [oddId]: signal({
      eId: eventId,
      mId: marketId,
      id: oddId,
      eStatus: storeState.value[eventId]?.value.status ?? "",
      mStatus:
        storeState.value[eventId]?.value.markets?.[marketId]?.value.status ??
        "",
      status:
        oddSig && typeof oddSig === "object" && "value" in oddSig
          ? oddSig.value.status
          : "",
      value:
        oddSig && typeof oddSig === "object" && "value" in oddSig
          ? oddSig.value.value
          : 1,
      mv:
        oddSig && typeof oddSig === "object" && "value" in oddSig
          ? oddSig.value.mv
          : 0,
    }),
  };
};

export const removeFromOddsStore = (ids: string[]) => {
  if (!ids.length) return;
  const next = { ...oddsStoreState.value };
  for (const id of ids) delete next[id];
  oddsStoreState.value = next;
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
