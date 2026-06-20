// Tuple codec for GET /users/sidebar/live — mirrors backend live-sidebar encoder

import type {
  DeltaEventInfo,
  DeltaMarket,
  DeltaScoreboard,
  DeltaSelection,
} from "@/helpers/snapshot.codec";

type LangMarketEntry = {
  type: string;
  candidates: number[];
  name?: string | null;
};

type LiveEvent = {
  eventInfo: DeltaEventInfo & { name?: string };
  markets: DeltaMarket[];
  scoreboard?: DeltaScoreboard | null;
};

type LiveLeague = { id: number; name?: string | null; events: LiveEvent[] };
type LiveRegion = { id: number; name?: string | null; leagues: LiveLeague[] };
type LiveSport = {
  id: number;
  name?: string | null;
  markets: LangMarketEntry[];
  regions: LiveRegion[];
};

export type LiveSidebarResponse = { sports: LiveSport[] };

type EncodedMarketEntry = [
  type: string,
  candidates: number[],
  name: string | null | undefined,
];

type EncodedSelection = [
  id: DeltaSelection["id"],
  name: DeltaSelection["name"],
  probability: DeltaSelection["probability"],
  price: DeltaSelection["price"],
  originalPrice: DeltaSelection["originalPrice"],
  status: DeltaSelection["status"],
  settlement: DeltaSelection["settlement"],
  deadHeatFactor: DeltaSelection["deadHeatFactor"],
  isBetBuilderSupported: DeltaSelection["isBetBuilderSupported"],
  competitorId: DeltaSelection["competitorId"],
  startingPrice: DeltaSelection["startingPrice"],
  extraParameters: DeltaSelection["extraParameters"],
];

type EncodedMarket = [
  id: DeltaMarket["id"],
  name: DeltaMarket["name"],
  tradingStatus: DeltaMarket["tradingStatus"],
  selections: EncodedSelection[] | null | undefined,
  type: DeltaMarket["type"],
  isBestLine: DeltaMarket["isBestLine"],
  isBetBuilderSupported: DeltaMarket["isBetBuilderSupported"],
  parameters: DeltaMarket["parameters"],
  extraData: DeltaMarket["extraData"],
];

type EncodedEventInfo = [
  id: DeltaEventInfo["id"],
  name: string | null | undefined,
  status: DeltaEventInfo["status"],
  tradingStatus: DeltaEventInfo["tradingStatus"],
  sport: [id: number | undefined, name: string | null | undefined],
  country: [id: number | undefined, name: string | null | undefined],
  competition: [id: number | undefined, name: string | null | undefined],
  season: [id: number | undefined, name: string | null | undefined],
  competitors:
    | [id: number | undefined, name: string | undefined, logo: string | null | undefined][]
    | null
    | undefined,
  isOutright: DeltaEventInfo["isOutright"],
  isBetBuilderSupported: DeltaEventInfo["isBetBuilderSupported"],
  startTime: DeltaEventInfo["startTime"],
];

type EncodedEvent = [
  eventInfo: EncodedEventInfo,
  markets: EncodedMarket[],
  scoreboard: DeltaScoreboard | null | undefined,
];
type EncodedLeague = [id: number, name: string | null | undefined, events: EncodedEvent[]];
type EncodedRegion = [id: number, name: string | null | undefined, leagues: EncodedLeague[]];
type EncodedSport = [
  id: number,
  name: string | null | undefined,
  markets: EncodedMarketEntry[],
  regions: EncodedRegion[],
];

export type EncodedLiveSidebar = EncodedSport[];

function decodeEventInfo(ei: EncodedEventInfo): LiveEvent["eventInfo"] {
  const [
    id,
    name,
    status,
    tradingStatus,
    sport,
    country,
    competition,
    season,
    competitors,
    isOutright,
    isBetBuilderSupported,
    startTime,
  ] = ei;

  return {
    id,
    name: name ?? undefined,
    status,
    tradingStatus,
    sport:
      sport[0] != null || sport[1] != null
        ? { id: sport[0], name: sport[1] }
        : undefined,
    country:
      country[0] != null || country[1] != null
        ? { id: country[0], name: country[1] }
        : undefined,
    competition:
      competition[0] != null || competition[1] != null
        ? { id: competition[0], name: competition[1] }
        : undefined,
    season:
      season[0] != null || season[1] != null
        ? { id: season[0], name: season[1] }
        : undefined,
    competitors:
      competitors?.map(([cId, cName]) => ({ id: cId, name: cName })) ?? null,
    isOutright,
    isBetBuilderSupported,
    startTime,
  };
}

function decodeMarkets(encodedMarkets: EncodedMarket[]): DeltaMarket[] {
  return encodedMarkets.map(
    ([
      mId,
      mName,
      mTradingStatus,
      selections,
      type,
      isBestLine,
      mIsBetBuilderSupported,
      parameters,
      extraData,
    ]) => ({
      id: mId,
      name: mName,
      tradingStatus: mTradingStatus,
      selections: selections?.map(
        ([
          sId,
          sName,
          probability,
          price,
          originalPrice,
          sStatus,
          settlement,
          deadHeatFactor,
          sIsBetBuilderSupported,
          competitorId,
          startingPrice,
          extraParameters,
        ]): DeltaSelection => ({
          id: sId,
          name: sName,
          probability,
          price,
          originalPrice,
          status: sStatus,
          settlement,
          deadHeatFactor,
          isBetBuilderSupported: sIsBetBuilderSupported,
          competitorId,
          startingPrice,
          extraParameters,
        }),
      ),
      type,
      isBestLine,
      isBetBuilderSupported: mIsBetBuilderSupported,
      parameters,
      extraData,
    }),
  );
}

export function decodeLiveSidebar(
  encoded: EncodedLiveSidebar,
): LiveSidebarResponse {
  return {
    sports: encoded.map(([sportId, sportName, markets, regions]) => ({
      id: sportId,
      name: sportName,
      markets: markets.map(([type, candidates, name]) => ({
        type,
        candidates,
        ...(name != null && { name }),
      })),
      regions: regions.map(([regionId, regionName, leagues]) => ({
        id: regionId,
        name: regionName,
        leagues: leagues.map(([leagueId, leagueName, events]) => ({
          id: leagueId,
          name: leagueName,
          events: events.map(([ei, encodedMarkets, scoreboard]) => ({
            eventInfo: decodeEventInfo(ei),
            markets: decodeMarkets(encodedMarkets),
            scoreboard,
          })),
        })),
      })),
    })),
  };
}
