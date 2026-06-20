// Tuple codec for GET /events/:id/snapshot — mirrors backend snapshot.encoder.ts

export interface DeltaSelection {
  id: number;
  name: string;
  probability: number;
  price: number;
  originalPrice: number;
  status: number;
  settlement: number;
  deadHeatFactor: number;
  isBetBuilderSupported: boolean;
  competitorId?: number;
  startingPrice?: number;
  extraParameters?: Record<string, string>;
}

export interface DeltaMarket {
  id: number;
  name: string;
  tradingStatus: number;
  selections?: DeltaSelection[];
  type: number;
  isBestLine?: boolean;
  isBetBuilderSupported?: boolean;
  parameters?: Record<string, string>;
  extraData?: Record<string, unknown>;
}

export interface DeltaEventInfo {
  id: number;
  status: number;
  tradingStatus: number;
  sport?: { id?: number; name?: string | null };
  country?: { id?: number; name?: string | null };
  competition?: { id?: number; name?: string | null };
  season?: { id?: number; name?: string | null };
  competitors?: { id?: number; name?: string }[] | null;
  isOutright?: boolean;
  isBetBuilderSupported?: boolean;
  startTime?: string;
}

export type DeltaScoreboard = Record<string, unknown>;
export type DeltaBetCancellation = Record<string, unknown>;

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

type EncodedMarketGroup = [id: number, name: string, order: number];

type EncodedMarketRef = [
  id: number,
  name: string,
  groups: EncodedMarketGroup[],
  isMultilineMarket: boolean,
  isFreeText: boolean,
];

type EncodedEventInfo = [
  id: DeltaEventInfo["id"],
  status: DeltaEventInfo["status"],
  tradingStatus: DeltaEventInfo["tradingStatus"],
  sport: [id: number | undefined, name: string | null | undefined],
  country: [id: number | undefined, name: string | null | undefined],
  competition: [id: number | undefined, name: string | null | undefined],
  season: [id: number | undefined, name: string | null | undefined],
  competitors:
    | [id: number | undefined, name: string | undefined, id2: number | undefined][]
    | null
    | undefined,
  isOutright: DeltaEventInfo["isOutright"],
  isBetBuilderSupported: DeltaEventInfo["isBetBuilderSupported"],
  startTime: DeltaEventInfo["startTime"],
];

export type EncodedSnapshot = [
  eventInfo: EncodedEventInfo,
  markets: EncodedMarket[],
  scoreboard: DeltaScoreboard | null | undefined,
  betCancellations: DeltaBetCancellation[] | null | undefined,
  marketRef: EncodedMarketRef[],
  marketOrder: number[],
];

type DecodedMarketRef = {
  id: number;
  name: string;
  groups: { id: number; name: string; order: number }[];
  isMultilineMarket: boolean;
  isFreeText: boolean;
};

export type DecodedSnapshot = {
  eventInfo: DeltaEventInfo;
  markets: DeltaMarket[];
  scoreboard: DeltaScoreboard | null | undefined;
  betCancellations: DeltaBetCancellation[] | null | undefined;
  marketRef: DecodedMarketRef[];
  marketOrder: number[];
};

export function decodeSnapshot(encoded: EncodedSnapshot): DecodedSnapshot {
  const [
    ei,
    encodedMarkets,
    scoreboard,
    betCancellations,
    encodedMarketRef,
    marketOrder,
  ] = encoded;
  const [
    id,
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

  const eventInfo: DeltaEventInfo = {
    id,
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

  const markets: DeltaMarket[] = encodedMarkets.map(
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

  const marketRef: DecodedMarketRef[] = encodedMarketRef.map(
    ([mrId, mrName, groups, isMultilineMarket, isFreeText]) => ({
      id: mrId,
      name: mrName,
      groups: groups.map(([gId, gName, gOrder]) => ({
        id: gId,
        name: gName,
        order: gOrder,
      })),
      isMultilineMarket,
      isFreeText,
    }),
  );

  return {
    eventInfo,
    markets,
    scoreboard,
    betCancellations,
    marketRef,
    marketOrder,
  };
}
