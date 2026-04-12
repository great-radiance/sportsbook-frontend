import { BetAmount } from "./BetDto";
import {
  Participant,
  Region,
  Sport,
  Competition as CompetitionType,
} from "./types";
import { Market as MarketType } from "./types";
import { Live } from "./types";

export interface LiveCalendarEvent {
  eventId: number;
  sport: Sport;
  startDate?: number;
  startTime?: number;
  participants: Participant[];
  marketsCount: number;
  region: Region;
  competition: CompetitionType;
  markets: MarketType[];
  marketTotal: number;
  sportId: number;
  live: Live;
  status: string;
  name: string;
  // winnerOdds: Odd[];
  // totalsGoalsOdds: Odd[];
  // handicapOdds: Odd[];
}

export interface Competitor {
  id: number;
  name: string;
}

export interface MarketParameters {
  hcp?: string;
  total?: string;
  goalnr?: string;
  variant?: string;
  [key: string]: string | undefined;
}

export interface ExtraParameters {
  competitorId?: string;
  hcp_for_the_rest?: string;
  [key: string]: string | undefined;
}

export interface Selection {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  status: number;
  settlement: number;
  competitorId: number;
  [key: string]: any;
}

export interface Market {
  id: number;
  name: string;
  type: number;
  labels?: string[];
  tradingStatus: number;
  selections: Selection[];
  parameters?: MarketParameters;
  extraParameters?: ExtraParameters;
  isBestLine?: boolean;
}

export interface Incident {
  type: number;
  competitorPosition: number;
  count: number;
}

export interface NormalizedIncident {
  type: "yellow_card" | "red_card" | "corners";
  competitorPosition: number;
  count: number;
}

export interface NormalizedEvent {
  _id: string;
  eventId: number;
  eventInfo: any;
  markets: {
    [type: number]: Market[];
  };
  scoreboard?: any;
  incidents?: NormalizedIncident[];
  betCancellations: any[];
  version: number;
  _v: number;
}

export interface responseData {
  data: NormalizedEvent[];
  limite: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface BetSelection {
  id: string;
  status: number;
  tradingStatus: number;
  eventId: number;
  eventName: string;
  marketId: number;
  marketType: number;
  marketName: string;
  selectionName: string;
  selectionId: number;
  price: number;
  stake?: BetAmount;
  isLive: boolean;
  sportIcon?: string;
  betbuilder?: boolean;
}

export interface Competition {
  name: string;
  apiId: number;
  __v: number;
  apiLocationId: number;
  translation: any;
  location: {
    apiId: number;
    name: string;
    translations: any;
  };
}

/**
 * Replace placeholders in text with actual values
 */
function replacePlaceholders(
  text: string,
  competitors: Competitor[],
  parameters?: MarketParameters,
  extraParameters?: ExtraParameters,
): string {
  let result = text;
  const competitor1 = competitors[0]?.name || "Team 1";
  const competitor2 = competitors[1]?.name || "Team 2";

  // Handle team-specific markets (when extraParameters.competitorId exists)
  let teamCompetitor1 = competitor1;
  let teamCompetitor2 = competitor2;

  if (extraParameters?.competitorId) {
    const competitorId = parseInt(extraParameters.competitorId);
    const teamCompetitor = competitors.find((c) => c.id === competitorId);
    if (teamCompetitor) {
      // For team-specific markets, both placeholders refer to the same team
      teamCompetitor1 = teamCompetitor.name;
      teamCompetitor2 = teamCompetitor.name;
    }
  }

  // Replace competitor placeholders
  result = result.replace(/\{\$competitor1\}/g, teamCompetitor1);
  result = result.replace(/\{\$competitor2\}/g, teamCompetitor2);

  // Replace handicap placeholders
  // Use hcp_for_the_rest if available, otherwise use hcp
  const hcpValue = extraParameters?.hcp_for_the_rest || parameters?.hcp;

  if (hcpValue) {
    // Handle different handicap formats
    if (hcpValue.includes(":")) {
      // Format like "0:1" or "2:0"
      const [hcp1, hcp2] = hcpValue.split(":");
      result = result.replace(/\{hcp\}/g, `${hcp1}:${hcp2}`);
    } else {
      // Format like "0.5", "1", "-0.25"
      result = result.replace(/\{hcp\}/g, hcpValue);
    }

    // Handle {+hcp} and {-hcp}
    const hcpNum = parseFloat(hcpValue);
    if (!isNaN(hcpNum)) {
      if (hcpNum >= 0) {
        result = result.replace(/\{\+hcp\}/g, `+${hcpValue}`);
        result = result.replace(/\{-hcp\}/g, `-${hcpValue}`);
      } else {
        result = result.replace(/\{\+hcp\}/g, hcpValue);
        const positiveHcp = Math.abs(hcpNum).toString();
        result = result.replace(/\{-hcp\}/g, `+${positiveHcp}`);
      }
    }
  } else if (parameters?.hcp) {
    // Fallback to parameters.hcp if hcp_for_the_rest is not available
    const hcp = parameters.hcp;
    if (hcp.includes(":")) {
      const [hcp1, hcp2] = hcp.split(":");
      result = result.replace(/\{hcp\}/g, `${hcp1}:${hcp2}`);
    } else {
      result = result.replace(/\{hcp\}/g, hcp);
    }
  }

  // Replace total placeholder
  if (parameters?.total) {
    result = result.replace(/\{total\}/g, parameters.total);
  }

  // Replace goal number placeholder
  if (parameters?.goalnr) {
    result = result.replace(/\{!goalnr\}/g, parameters.goalnr);
    result = result.replace(/\{goalnr\}/g, parameters.goalnr);
  }

  // Replace variant placeholder
  if (parameters?.variant) {
    result = result.replace(/\{variant\}/g, parameters.variant);
  }

  return result;
}

/**
 * Normalize incidents
 */
function normalizeIncidents(incidents: Incident[]): NormalizedIncident[] {
  const incidentTypeMap: {
    [key: number]: "yellow_card" | "red_card" | "corners";
  } = {
    0: "yellow_card",
    1: "red_card",
    2: "corners",
  };

  return incidents.map((incident) => ({
    type: incidentTypeMap[incident.type] || "yellow_card",
    competitorPosition: incident.competitorPosition,
    count: incident.count,
  }));
}

/**
 * Normalize a single event
 */
export const NormalizeEvent = (event: any): NormalizedEvent => {
  const competitors = event.eventInfo?.competitors || [];
  const markets = event.markets || [];
  // Handle missing scoreboard - only get incidents if scoreboard exists
  const incidents = event.scoreboard?.incidents || [];

  // Group markets by type
  const groupedMarkets: { [type: number]: Market[] } = {};

  markets.forEach((market: Market) => {
    // Normalize market name
    const normalizedMarket: Market = {
      ...market,
      name: replacePlaceholders(
        market.name,
        competitors,
        market.parameters,
        market.extraParameters,
      ),
      selections: market.selections.map((selection: Selection) => ({
        ...selection,
        name: replacePlaceholders(
          selection.name,
          competitors,
          market.parameters,
          market.extraParameters,
        ),
      })),
    };

    // Group by type
    if (!groupedMarkets[market.type]) {
      groupedMarkets[market.type] = [];
    }
    groupedMarkets[market.type].push(normalizedMarket);
  });

  // Normalize incidents only if they exist
  const normalizedIncidents =
    incidents.length > 0 ? normalizeIncidents(incidents) : undefined;

  const normalizedEvent: NormalizedEvent = {
    _id: event._id,
    eventId: event.id,
    eventInfo: event.eventInfo,
    markets: groupedMarkets,
    incidents: normalizedIncidents,
    betCancellations: event.betCancellations,
    version: event.version,
    _v: event._v,
  };

  // Only include scoreboard if it exists
  if (event.scoreboard) {
    normalizedEvent.scoreboard = event.scoreboard;
  }

  return normalizedEvent;
};

/**
 * Normalize a list of events
 */
export const NormalizeEventsList = (events: any): NormalizedEvent[] => {
  // Handle different response formats
  if (!events) {
    return [];
  }

  let normalizedEvents: NormalizedEvent[] = [];

  // If it's already an array
  if (Array.isArray(events)) {
    normalizedEvents = events.map((event) => NormalizeEvent(event));
  }

  // If it's an object with a data property
  if (events.data && Array.isArray(events.data)) {
    normalizedEvents = events.data.map((event: any) => NormalizeEvent(event));
  }

  // If it's a single event object
  if (events.eventInfo || events._id || events.eventId) {
    normalizedEvents = [NormalizeEvent(events)];
  }

  // let noDuplicateEvents: NormalizedEvent[] = [];
  // normalizedEvents.forEach((event) => {
  //   const isExist = noDuplicateEvents.findIndex((e) => e.eventId.toString() !== event.id.toString());
  //   console.log('isExist', isExist);
  //   if (isExist === -1) {
  //     noDuplicateEvents = [...noDuplicateEvents, event];
  //   }
  // });

  // console.log('noDuplicateEvents', noDuplicateEvents);
  // if (noDuplicateEvents.length > 0) {
  //   return noDuplicateEvents;
  // }

  return normalizedEvents;
  // Fallback: return empty array
  console.warn("NormalizeEventsList: Unexpected data format", events);
  return [];
};

/**
 * Group events by sport
 */
export const GroupEventsBySport = (events: any[]) => {
  return events.reduce((acc, event) => {
    const sport = event.sport;
    if (!acc[sport]) {
      acc[sport] = [];
    }
    acc[sport].push(event);
    return acc;
  }, {});
};

/**
 * Get markets of a specific type from a normalized event
 */
export const getMarketsByType = (
  normalizedEvent: NormalizedEvent,
  marketType: number,
): Market[] => {
  return normalizedEvent.markets[marketType] || [];
};

/**
 * Get the best line market of a specific type
 */
export const getBestLineMarket = (
  normalizedEvent: NormalizedEvent,
  marketType: number,
): Market | undefined => {
  const markets = getMarketsByType(normalizedEvent, marketType);
  return markets.find((m) => m.isBestLine) || markets[0];
};
