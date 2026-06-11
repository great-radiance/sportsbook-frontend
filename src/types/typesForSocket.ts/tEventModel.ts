import { Signal } from "@preact/signals";
// import type { SidebarMarketRef } from "@/state/summarySports";

export type SidebarMarketRef = any;

/** Single odd row stored under `tOddsModel.odds[oddId]` */
export type tSelectionValue = {
  id: number;
  name: string;
  nickName?: string;
  probability: number;
  price: number;
  originalPrice: number;
  status: number;
  settlement: number;
  deadHeatFactor: number;
  extraParameters: Record<string, string>;
  isBetBuilderSupported: boolean;
  competitionId: number;
  startingPrice: number;
  /** Price move: 1 = up, -1 = down, 0 = unchanged (set on WS update). */
  mv: number;
};

export type tSelectionSignal = Signal<tSelectionValue>;

export type tMarketModel = {
  id: number;
  name: string;
  tradingStatus: number;
  type: number;
  isBestLine: boolean;
  parameters: Record<string, string>;
  extraParameters: Record<string, string>;
  isBetBuilderSupported: boolean;
  selections: Signal<tSelectionValue>[]; // selection Array
};

export type tEventModel = {
  id: number;
  name: string;
  status: number;
  tradingStatus: number;
  statusDescription: string;
  sport: {
    id: number;
    name: string;
  };
  region: {
    id: number;
    name: string;
  };
  league: {
    id: number;
    name: string;
  };
  season: {
    id: number;
    name: string;
  };
  competitors: competitor[];
  startTime: string;
  isOutright: boolean;
  customdisplayData: any;
  isBetBuilderSupported: boolean;
  mappingInfo: {
    feedId: number;
    id: string;
  }[];
  markets: Record<number, Signal<tMarketModel>>; //marketId to marketModel
  /** From `GET /odds88/events/:eventId` — groups markets by tab in MarketsBoard. */
  marketsRef?: SidebarMarketRef[];
  scoreboard?: any;
};

export type tBetOddsModel = {
  eId: number;
  mId: string;
  status: string;
  value: number;
  mv: number;
};

export type competitor = {
  id: number;
  name: string;
  logo?: string;
};

// export type tBetMarketModel = {
//   mStatus: Signal<string>;
//   [oddId: string]: Signal<tBetOddsModel | string>;
// };

// export type tBetEventModel = {
//   eStatus: Signal<string>;
//   [marketId: string]: Signal<tBetMarketModel | string>;
// };

// export type tOddsStoreModel = {
//   [eventId: number]: Signal<tBetEventModel>;
// };
