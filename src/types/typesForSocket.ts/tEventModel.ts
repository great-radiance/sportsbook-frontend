import { League } from "@/shared/utils/summary";
import {
  Competition,
  Live,
  MarketProperties,
  Odd,
  Participant,
  Region,
  Sport,
} from "@/shared/utils/types";
import { OddProperties, OddStatus } from "@/shared/utils/types";
import { tParticipant } from "../tEvent";
import { Signal } from "@preact/signals";

/** Single odd row stored under `tOddsModel.odds[oddId]` */
export type tOddValue = {
  id: string;
  value: number;
  impliedOdd: number | null;
  status: string;
  mv: number;
  column: number;
  sort: number;
  name:
    | string
    | { e: string | null; o: string | null; h: string | null }
    | null;
};

export type tOddsModel = {
  oddIdList: string[];
  odds: Record<string, Signal<tOddValue>>;
};

export type tOddSignal = Signal<tOddValue>;

export type tMarketModel = {
  id: string;
  status: string;
  name: string;
  column: number;
  groups: number[];
  sort: number;
  odds: tOddsModel; // oddId to tOddModel
};

export type tEventModel = {
  id: number;
  sport: string;
  region: string;
  league: string;
  participants: tParticipant[];
  startDate: number; // timestamp
  status: string;
  sportRadarId: string;
  outright: boolean;
  markets: Record<string, Signal<tMarketModel>>; //marketSlug to marketId (uuid)
  live?: Live;
};

export type tBetOddsModel = {
  eId: number;
  mId: string;
  status: string;
  value: number;
  mv: number;
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
