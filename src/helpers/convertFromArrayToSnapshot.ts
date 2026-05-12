export function convertFromArrayToSnapshot(
  arr: unknown[],
): Record<string, any> {
  const [eventInfoArray, marketsArray, scoreboard] = arr as any[];

  const [
    id,
    name,
    status,
    tradingStatus,
    sport,
    country,
    competition,
    season,
    competitors = [],
    startTime,
    isOutright,
    isBetBuilderSupported,
  ] = eventInfoArray ?? [];

  return {
    eventInfo: {
      id,
      name,
      status,
      tradingStatus,
      sport: {
        id: sport?.[0],
        name: sport?.[1],
      },
      country: {
        id: country?.[0],
        name: country?.[1],
      },
      competition: {
        id: competition?.[0],
        name: competition?.[1],
      },
      season,
      competitors: competitors.map((c: any) => ({
        id: c?.[0],
        name: c?.[1],
      })),
      startTime,
      isOutright,
      isBetBuilderSupported,
    },

    markets: (marketsArray ?? []).map((m: any) => {
      const [
        id,
        name,
        tradingStatus,
        type,
        isBestLine,
        parameters,
        extraParameters,
        isBetBuilderSupported,
        selections = [],
      ] = m ?? [];

      return {
        id,
        name,
        tradingStatus,
        type,
        isBestLine,
        parameters,
        extraParameters,
        isBetBuilderSupported,
        selections: selections.map((g: any) => {
          const [
            id,
            name,
            probability,
            price,
            originalPrice,
            status,
            settlement,
            deadHeatFactor,
            extraParameters,
            isBetBuilderSupported,
            competitorId,
            startingPrice,
          ] = g ?? [];

          return {
            id,
            name,
            probability,
            price,
            originalPrice,
            status,
            settlement,
            deadHeatFactor,
            extraParameters,
            isBetBuilderSupported,
            competitorId,
            startingPrice,
          };
        }),
      };
    }),

    scoreboard,
  };
}
