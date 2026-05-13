import { signal } from "@preact/signals";
import { tCounts, tSportResponse } from "@/api/sidebar/apiGetSummaryArray";

// interface GroupedData {
//   [sportId: number]: {
//     [competitionId: number]: BoostedOddsEvent[];
//   };
// }
export type summaryData = {
  data: tSportResponse;
  counts: tCounts;
  TotalCount: number;
};

export const summarySports = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const summarySportsLive = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const outRightSummarySports = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const liveCount = signal<number>(0);
export const prematchCount = signal<number>(0);
// export const testData = signal<GroupedData>({});
export const stateScoreBoardId = signal<string>("");
