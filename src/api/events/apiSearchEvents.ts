import { instance } from "../instance";
import { unwrapApiData } from "../unwrapApiData";
import {
  mapGuideSearchEventToRow,
  type GuideSearchEventItem,
} from "@/helpers/mapGuideSearchEvent";
import type { SearchEventRow } from "@/types/searchEvent";
import { getAppConfig } from "@/shared/config/appConfig";

export type EventsSearchParams = {
  q?: string;
  pageSize?: number;
  page?: number;
  lang?: string;
};

export type EventsSearchResponse = {
  source?: string;
  total: number;
  data: SearchEventRow[];
};

/** `GET /events/search` — integration guide. Results cached ~30s server-side. */
export async function apiSearchEvents(
  params: EventsSearchParams,
): Promise<EventsSearchResponse> {
  const { lang } = getAppConfig();
  const { data: raw } = await instance.get<
    | { total: number; data: GuideSearchEventItem[]; source?: string }
    | { data: { total: number; data: GuideSearchEventItem[]; source?: string } }
  >("users/events/search", {
    params: {
      ...(params.q ? { q: params.q } : {}),
      ...(params.pageSize ? { pageSize: params.pageSize } : { pageSize: 10 }),
      ...(params.page ? { page: params.page } : { page: 1 }),
      lang: params.lang ?? lang ?? "en",
    },
  });

  const body =
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
      ? (raw as {
          total: number;
          data: GuideSearchEventItem[];
          source?: string;
        })
      : unwrapApiData<{
          total: number;
          data: GuideSearchEventItem[];
          source?: string;
        }>(raw);

  const rows = (body.data ?? []).map(mapGuideSearchEventToRow);
  return {
    source: body.source,
    total: body.total ?? rows.length,
    data: rows,
  };
}
