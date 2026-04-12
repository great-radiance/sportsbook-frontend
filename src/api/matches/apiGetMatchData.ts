import { Live } from "@/shared/utils/types";
import { instance } from "../instance";
import { tEvent } from "@/types/tEvent";

export type MatchDataResponse = {
  data: {
    items: {
      fixture: {
        eventId: number;
        startDate: number;
        // properties: {
        //   eventName: string;
        //   eventRound: string;
        //   eventType: number;
        // };
        status: string;
        sportRadarId: number;
        outright: boolean;
        sport: {
          name: string;
        };
        competition: {
          name: string;
        };
        region: {
          name: string;
        };
        participants: {
          name: string;
        }[];
        participantsInfo: {
          name: string;
          home: boolean;
        }[];
      };
      markets: {
        name: string;
        marketId: string;
        providerName: string;
        status: string;
        properties: {
          column: number;
          groups: number[];
          id: number;
          name_template: string;
          sort: number;
          numbers: number[];
          uni_name: string;
          category: string;
        };
        odds: {
          name: string;
          status: string;
          odd: number;
          properties: {
            e: string;
            o: string;
            h: string;
            uuid: string;
          };
          sort: number;
          column: number;
          mv: number;
          value: number;
          impliedOdd: number;
        }[];
      }[];
      live: Live;
    }[];
  };
};

export const apiGetMatchData = async (eventId: number) => {
  const response = await instance.get<MatchDataResponse>(
    `/cybet/matches/PING-EVENT/${eventId}`,
  );
  return response.data.data.items[0];
};
