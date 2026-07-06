import type { LocationHookType } from "@/state/sportsbookStoreContext";

export type RouteType = "hash" | "memory" | "browser";

export const ROUTE_TYPE_TO_HOOK: Record<RouteType, LocationHookType> = {
  hash: "useHashLocation",
  memory: "useMemoryLocationWithHistory",
  browser: "useBrowserLocation",
};

export function normalizeRouteType(value: string | undefined): RouteType | undefined {
  if (value === "hash" || value === "memory" || value === "browser") {
    return value;
  }
  return undefined;
}
