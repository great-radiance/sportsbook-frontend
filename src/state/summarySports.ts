import { signal } from "@preact/signals";

import type {
  countsBySport,
  countsSummary,
  sidebarNode,
} from "@/api/sidebar/apiGetSidebar";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";

export const summarySportsState = signal<sidebarNode[]>([]);
export const summarySportsLiveState = signal<LiveSidebarStoreSport[]>([]);

export const countsSummarySportsState = signal<countsSummary>({
  preMatchCount: {
    counts: {} as countsBySport,
    totalCount: 0,
  },
  liveCount: {
    counts: {} as countsBySport,
    totalCount: 0,
  },
  outrightCount: {
    counts: {} as Record<number, { count: number; name: string }>,
    totalCount: 0,
  },
});
