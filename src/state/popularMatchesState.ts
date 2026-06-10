import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import { signal } from "@preact/signals";

export const popularMatchesState = signal<MatchDataResponse[]>([]);
