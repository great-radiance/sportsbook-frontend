/** Competitor in a live stream match */
export interface LiveStreamCompetitor {
  id: string;
  sport_id: string;
  name: string;
  abbreviation?: string;
  country_code?: string;
  country_code_img?: string;
  mapped_sport_id: number;
}

/** Match description from live stream API */
export interface LiveStreamMatchDesc {
  scheduled: number;
  type: "match";
  slug: string;
  sport: string;
  category: string;
  tournament: string;
  competitors: LiveStreamCompetitor[];
  mapped_sport_id: number;
  /** Broadcast / embed URL (YouTube, Twitch, Kick, softo CDN, etc.) */
  broadcast?: string;
  virtual?: boolean;
}

/** Single event entry: region -> eventId -> { desc } */
export interface LiveStreamEventEntry {
  desc: LiveStreamMatchDesc;
}

/** Nested map: eventId -> unknown -> event entry */
export type LiveStreamDataMap = Record<string, Record<string, LiveStreamEventEntry>>;

