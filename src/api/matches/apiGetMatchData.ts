import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";
import type { SidebarMarketRef } from "@/state/summarySports";

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
      extraParameters: {
        [key: string]: string;
      };
      isBetBuilderSupported: boolean;
      competitionId: number;
      startingPrice: number;
    }[];
    type: number;
    isBestLine: boolean;
    parameters: {
      [key: string]: string;
    };
    extraParameters: {
      [key: string]: string;
    };
    isBetBuilderSupported: boolean;
  }[];
  /** Market type metadata and group tabs for the event detail UI. */
  marketsRef?: SidebarMarketRef[];
  scoreboard: any;
  betCancellations: any[];
  time: number;
  eventId: number;
  version: number;
  correlationId: string;
  creationTime: string;
  sportId: number;
  locationId: number;
  leagueId: number;
  updateSequence: number;
  lastUpdatedTime: number;
};

export const apiGetMatchData = async (eventId: number) => {
  const response = await instance.get<{ data: MatchDataResponse }>(
    `/odds88/events/${eventId}?lang=${getAppConfig().lang}`,
  );
  return response.data.data;
};
