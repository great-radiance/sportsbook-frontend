import { Live } from "@/shared/utils/types";

export type tOdd = {
  id: string;
  value: number;
  impliedOdd: number | null;
  status: string;
  mv: number;
  column: number;
  name:
    | string
    | { e: string | null; o: string | null; h: string | null }
    | null;
  sort: number;
};

export type tMarket = {
  id: string;
  status: string;
  name: string;
  column: number;
  groups: number[];
  sort: number;
  odds: tOdd[] | null;
};

export type tEvent = {
  id: number;
  sport: string;
  region: string;
  league: string;
  startDate: number;
  status: string;
  participants: tParticipant[];
  sportRadarId: number;
  outright: boolean;
  live?: Live | undefined;
  markets: tMarket[];
};

export type tParticipant = {
  name: string | null;
  home?: boolean;
};
