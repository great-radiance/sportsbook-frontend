import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";
import type { MatchDataResponse } from "./apiGetMatchData";

export type UpcomingEventsResponse = {
  data: MatchDataResponse[];
  total: number;
  pageFrom: number;
  pageTo: number;
  pageSize: number;
};

export type UpcomingEventsParams = {
  sport: number;
  pageFrom?: number;
  pageTo?: number;
  isTrending?: boolean;
  dateFrom?: number;
  dateTo?: number;
};

/** Default window: today → +14 days (unix seconds). */
export function defaultUpcomingDateRange(): {
  dateFrom: number;
  dateTo: number;
} {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 14);
  to.setHours(23, 59, 59, 999);
  return {
    dateFrom: Math.floor(from.getTime() / 1000),
    dateTo: Math.floor(to.getTime() / 1000),
  };
}

export async function apiGetUpcomingEvents(
  params: UpcomingEventsParams,
): Promise<UpcomingEventsResponse> {
  const pageFrom = params.pageFrom ?? 0;
  const pageTo = params.pageTo ?? 10;
  const isTrending = params.isTrending ?? false;
  const { data } = await instance.get<UpcomingEventsResponse>(
    `users/events/upcoming`,
    {
      params: {
        sport: params.sport,
        pageFrom: pageFrom,
        pageTo: pageTo,
        isTrending: isTrending,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    },
  );

  return data;
}

/** @deprecated legacy shape used by UpcomingMatches date tabs */
export type apiGetUpcomingResponse = {
  data: MatchDataResponse[];
  total: number;
  pageFrom: number;
  pageTo: number;
};

/** Legacy offset pagination — maps to page-based upcoming API. */
export async function apiGetUpcoming(
  dateFrom: number,
  dateTo: number,
  pageFrom: number,
  pageTo: number,
  sport: number,
): Promise<apiGetUpcomingResponse> {
  const pageSize = Math.max(1, pageTo - pageFrom);
  const page = Math.floor(pageFrom / pageSize) + 1;

  const response = await apiGetUpcomingEvents({
    sport,
    pageFrom: pageFrom,
    pageTo: pageTo,
    isTrending: false,
    dateFrom: dateFrom,
    dateTo: dateTo,
  });

  return {
    data: response.data,
    total: response.total,
    pageFrom: response.pageFrom,
    pageTo: response.pageTo,
  };
}
