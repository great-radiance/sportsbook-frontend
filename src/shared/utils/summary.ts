import { FixtureStatus } from "./types";
import { Region } from "./types";
import { Competition } from "./types";

export interface MatchData {
  eventId: number;
  name: string;
  startTime: number;
}

export interface CompetitionData {
  leagueId: number;
  count: number;
  matches: MatchData[];
}

export interface LeaguesData {
  [competitonName: string]: CompetitionData; // Dynamic league name keys
}

export interface regionsData {
  [regionName: string]: RegionData;
}
export interface RegionData {
  regionId: number;
  count: number;
  leagues: LeaguesData;
}

export interface SportData {
  sportId: number;
  count: number;
  regions: regionsData;
}

export interface  StatusData {
  [sportName: string]: SportData; // Dynamic sport name keys
}

export interface SummaryData {
  [status: string]: StatusData;
}







export interface Participant {
  seqId: number;
  id: number | null;
  name: string | null;
  providerId: number;
  providerName: string;
  home?: boolean;
}



export interface Match {
  eventId: number;
  participants: Participant[];
  region: Region;
  competition: Competition;
  startTime: number;
  status: string;
}

export interface League {
  sportRadarId: number;
  providerId: number;
  competitonName: string;
  matches: Match[];
}

export interface Sport {
  sportName: string;
  sportId: number;
  leagues: League[];
}

export interface PopularCompetitionResponse extends Array<Sport> {}

export interface BoostedOddsEvent {
  eventId: number;
  participants: Participant[];
  status: string;
  regionId: number;
  competitionId: number;
  sportId: number;
  startTime: number;
  boostedValue: number;
}

export interface BoostedOddsResponse extends Array<BoostedOddsEvent> {}