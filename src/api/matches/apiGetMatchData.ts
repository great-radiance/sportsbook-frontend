import { instance } from "../instance";
import {
  decodeSnapshot,
  type DecodedSnapshot,
  type EncodedSnapshot,
} from "@/helpers/snapshot.codec";
import { enrichMarketRefWithMainTypes } from "@/helpers/eventMarketGroups";

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
  /** Market type ids for the Main/Popular tab (from snapshot). */
  mainMarketTypes?: number[];
};

export function toMatchDataResponse(
  snapshot: Pick<DecodedSnapshot, "eventInfo" | "markets"> & {
    mainMarketTypes?: DecodedSnapshot["mainMarketTypes"];
    scoreboard?: DecodedSnapshot["scoreboard"];
    marketRef?: DecodedSnapshot["marketRef"];
  },
): MatchDataResponse {
  const {
    eventInfo,
    markets,
    scoreboard,
    marketRef = [],
    mainMarketTypes = [],
  } = snapshot;
  const competitors = eventInfo.competitors ?? [];
  const sportId = eventInfo.sport?.id ?? 0;
  const eventName = (eventInfo as DecodedSnapshot["eventInfo"] & { name?: string }).name;
  const name =
    eventName ??
    (competitors.length >= 2
      ? `${competitors[0]?.name ?? ""} - ${competitors[1]?.name ?? ""}`
      : (competitors[0]?.name ?? ""));

  return {
    eventInfo: {
      id: eventInfo.id,
      name,
      status: eventInfo.status,
      tradingStatus: eventInfo.tradingStatus,
      statusDescription: "",
      country: {
        id: eventInfo.country?.id ?? 0,
        name: eventInfo.country?.name ?? "",
      },
      sport: {
        id: sportId,
        name: eventInfo.sport?.name ?? "",
      },
      competition: {
        id: eventInfo.competition?.id ?? 0,
        name: eventInfo.competition?.name ?? "",
      },
      season: {
        id: eventInfo.season?.id ?? 0,
        name: eventInfo.season?.name ?? "",
      },
      competitors: competitors.map((c) => ({
        id: c.id ?? 0,
        name: c.name ?? "",
      })),
      startTime: eventInfo.startTime ?? "",
      isOutright: eventInfo.isOutright ?? false,
      isBetBuilderSupported: eventInfo.isBetBuilderSupported ?? false,
      customDisplayData: undefined,
      mappingInfo: [],
    },
    markets: markets.map((market) => ({
      id: market.id,
      name: market.name,
      tradingStatus: market.tradingStatus,
      selections: (market.selections ?? []).map((selection) => ({
        id: selection.id,
        name: selection.name,
        probability: selection.probability,
        price: selection.price,
        originalPrice: selection.originalPrice,
        status: selection.status,
        settlement: selection.settlement,
        deadHeatFactor: selection.deadHeatFactor,
        extraParameters: selection.extraParameters ?? {},
        isBetBuilderSupported: selection.isBetBuilderSupported,
        competitionId: 0,
        startingPrice: selection.startingPrice ?? 0,
      })),
      type: market.type,
      isBestLine: market.isBestLine ?? false,
      parameters: market.parameters ?? {},
      extraParameters: (market.extraData as Record<string, string> | undefined) ?? {},
      isBetBuilderSupported: market.isBetBuilderSupported ?? false,
    })),
    scoreboard,
    marketRef: enrichMarketRefWithMainTypes(
      marketRef.map((ref) => ({
        id: ref.id,
        name: ref.name,
        groups: ref.groups.map((group) => ({
          id: group.id,
          name: group.name,
          order: group.order,
          sportId,
        })),
        isMultilineMarket: ref.isMultilineMarket,
        isFreeText: ref.isFreeText,
        sportId,
      })),
      mainMarketTypes,
    ),
    mainMarketTypes,
  };
}

export const apiGetMatchData = async (eventId: number) => {
  const response = await instance.get<EncodedSnapshot | null>(
    `users/events/${eventId}/snapshot`,
  );
  if (!response.data) return null;
  return toMatchDataResponse(decodeSnapshot(response.data));
};
