import { Live } from "@/shared/utils/types";
import { Signal } from "@preact/signals";

/** Single odd row stored under `tOddsModel.odds[oddId]` */
export type tSelectionValue = {
  id: number;
  name: string;
  probability: number;
  price: number;
  originalPrice: number;
  status: number;
  settlement: number;
  deadHeatFactor: number;
  extraParameters: Record<string, string>;
  isBetBuilderSuported: boolean;
  competitionId: number;
  startingPrice: number;
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
  isBetBuilderSuported: boolean;
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
  isBetBuilderSuported: boolean;
  mappingInfo: {
    feedId: number;
    id: string;
  }[];
  markets: Record<string, Signal<tMarketModel>>; //marketSlug to marketId (uuid)
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
