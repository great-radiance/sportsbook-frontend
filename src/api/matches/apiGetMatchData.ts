import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";

export type MarketRef = {
  id: number;
  name: string;
  groups: {
    id: number;
    name: string;
    order: number;
    sportId: number;
  }[];
  isMultilineMarket: boolean;
  isFreeText: boolean;
  sportId: number;
};

export type MatchDataResponse = {
  eventInfo: {
    id: number;
    name: string;
    status: number;
    tradingStatus: number;
    statusDescription: string;
    country: {
      id: number;
      name: string;
    };
    sport: {
      id: number;
      name: string;
    };
    competition: {
      id: number;
      name: string;
    };
    season: {
      id: number;
      name: string;
    };
    competitors: {
      id: number;
      name: string;
    }[];
    startTime: string;
    isOutright: boolean;
    isBetBuilderSupported: boolean;
    customDisplayData: any;
    mappingInfo: {
      feedId: number;
      id: string;
    }[];
  };
  markets: {
    id: number;
    name: string;
    tradingStatus: number;
    selections: {
      id: number;
      name: string;
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
    }[];
    type: number;
    isBestLine: boolean;
    parameters: Record<string, string>;
    extraParameters: Record<string, string>;
    isBetBuilderSupported: boolean;
  }[];
  scoreboard?: any;
  /** Market type metadata and group tabs for the event detail UI. */
  marketRef?: MarketRef[];
  // scoreboard: any;
  // betCancellations: any[];
  // time: number;
  // eventId: number;
  // version: number;
  // correlationId: string;
  // creationTime: string;
  // sportId: number;
  // locationId: number;
  // leagueId: number;
  // updateSequence: number;
  // lastUpdatedTime: number;
};

export const apiGetMatchData = async (eventId: number) => {
  const response = await instance.get<MatchDataResponse | null>(
    `users/events/${eventId}/snapshot`,
  );
  return response.data ?? null;
};
