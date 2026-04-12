import { Live, Market } from "@/shared/utils/types";
import { tParticipant } from "./tEvent";

export type tBasicEvent = {
  eventId: number;

  sportSlug?: string;
  sportName?: string;

  regionSlug?: string;
  regionName?: string;

  leagueSlug?: string;
  leagueName?: string;

  marketCount?: number;

  participants: tParticipant[];
  startDate: number;
  status: string;
  live?: Live;

  markets: Record<string, any>;
};
