import type { SportsbookInitOptions } from "@/core/sportsbookInit";
import {
  normalizeRouteType,
  type RouteType,
} from "@/app/router/routeType";

function readString(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value && value.length > 0 ? value : undefined;
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw == null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readRouteType(params: URLSearchParams): RouteType {
  return normalizeRouteType(readString(params, "routeType")) ?? "hash";
}

/** Parse iframe query string into sportsbook init options. */
export function parseEmbedQuery(search: string): SportsbookInitOptions {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const themeEditorData =
    readString(params, "themeEditorData") ??
    readString(params, "theme") ??
    import.meta.env.VITE_THEME_COLORS;

  return {
    host:
      readString(params, "host") ??
      import.meta.env.VITE_API_BASE_URL ??
      "https://api.odds.databetrix.com/api/v1/",
    cid:
      readString(params, "cid") ??
      readString(params, "partnerId") ??
      import.meta.env.VITE_PARTNER_ID ??
      "dev-partner-id",
    lang: readString(params, "lang") ?? import.meta.env.VITE_DEFAULT_LANG ?? "en",
    containerId: "sportsbook-placeholder",
    allowToChangeParentStyles: true,
    embedMode: "iframe",
    routeType: readRouteType(params),
    themeEditorData,
    xOperatorId:
      readString(params, "xOperatorId") ?? import.meta.env.VITE_API_ID,
    xSportsbookToken: readString(params, "xSportsbookToken"),
    xUserId: readString(params, "xUserId"),
    xUserName: readString(params, "xUserName"),
    xUserBalance: readNumber(params, "xUserBalance"),
    currency: readString(params, "currency"),
    bottomLayoutHeight: readNumber(params, "bottomLayoutHeight"),
    baseTheme: readString(params, "baseTheme") ?? import.meta.env.VITE_BASE_THEME,
  };
}
