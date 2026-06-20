import { storeEvent } from "@/helpers/storeEvent";
import { instance } from "../instance";
import { toMatchDataResponse } from "../matches/apiGetMatchData";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import {
  decodeLiveSidebar,
  type EncodedLiveSidebar,
} from "@/helpers/liveSidebar.codec";

const { countsSummarySportsState, summarySportsLiveState } = sportsbookStore;

export type LiveSidebarSport = {
  id: number;
  name: string;
  markets: {
    type: string;
    candidates: number[];
    name: string;
  }[];
  regions: {
    id: number;
    name: string;
    leagues: {
      id: number;
      name: string;
      events: number[];
    }[];
  }[];
};

export type LiveSidebarStoreSport = {
  id: number;
  name: string;
  markets: LiveSidebarSport["markets"];
  regions: {
    id: number;
    name: string;
    leagues: {
      id: number;
      name: string;
      events: number[];
    }[];
  }[];
};

export async function apiGetLiveSidebar() {
  const res = await instance.get<
    EncodedLiveSidebar | { sports: EncodedLiveSidebar }
  >("users/sidebar/live");
  const encoded = Array.isArray(res.data)
    ? res.data
    : (res.data?.sports ?? []);
  const { sports } = decodeLiveSidebar(encoded);

  const storeSports: LiveSidebarStoreSport[] = sports.map((sport) => ({
    id: sport.id,
    name: sport.name ?? "",
    markets: (sport.markets ?? []).map((market) => ({
      type: market.type,
      candidates: market.candidates,
      name: market.name ?? "",
    })),
    regions: (sport.regions ?? []).map((region) => ({
      id: region.id,
      name: region.name ?? "",
      leagues: (region.leagues ?? []).map((league) => ({
        id: league.id,
        name: league.name ?? "",
        events: (league.events ?? []).map((event) => {
          const matchData = toMatchDataResponse(event);
          storeEvent(matchData);
          return matchData.eventInfo.id;
        }),
      })),
    })),
  }));

  const liveCount = {
    counts: {} as Record<number, number>,
    totalCount: 0,
  };

  for (const sport of storeSports) {
    let count = 0;
    for (const region of sport.regions) {
      for (const league of region.leagues) {
        count += league.events.length;
      }
    }
    liveCount.counts[sport.id] = count;
    liveCount.totalCount += count;
  }

  summarySportsLiveState.value = storeSports;
  countsSummarySportsState.value = {
    ...countsSummarySportsState.value,
    liveCount,
  };

  return { sports: storeSports, liveCount };
}
