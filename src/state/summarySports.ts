import { signal } from "@preact/signals";

import type {
  countsBySport,
  countsSummary,
  sidebarNode,
} from "@/api/sidebar/apiGetSidebar";

export const summarySportsState = signal<sidebarNode[]>([]);

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
    counts: {} as countsBySport,
    totalCount: 0,
  },
});
export const featuredLeaguesState = signal<sidebarNode[]>([]);
