import { signal } from "@preact/signals";
import { BoostedOddsEvent } from "@/shared/utils/summary";
import {
  tPrematchSidebarData,
  tSportResponse,
} from "@/api/sidebar/apiGetPrematchSidebar";
import { tLiveSidebarData } from "@/api/sidebar/apiGetSidebar";
import { tOrderConfigration } from "@/api/sidebar/apiGetOrderConfigration";

interface GroupedData {
  [sportId: number]: {
    [competitionId: number]: BoostedOddsEvent[];
  };
}

export const summarySports = signal<tPrematchSidebarData>({
  data: {},
  counts: {},
  permatchTotalCount: 0,
});
export const outRightSummarySports = signal<tSportResponse>({});

export const summarySportsLive = signal<tLiveSidebarData>({
  data: {},
  counts: {},
  liveTotalCount: 0,
});

export const liveCount = signal<number>(0);
export const prematchCount = signal<number>(0);
export const testData = signal<GroupedData>({});
export const stateScoreBoardId = signal<string>("");
