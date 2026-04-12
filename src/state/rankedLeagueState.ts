import { signal } from "@preact/signals";

export const rankedLeagueState = signal<
  {
    sport: string;
    region: string;
    league: string;
  }[]
>([]);
