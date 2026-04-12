import { useMemo, useCallback } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { locationHookType } from '@/state/locationHookType';
import { readFullFromHash } from '@/app/router/ShadowLocation';
import { routeQueryState, routeFullState } from '@/state/routeState';
import { useSignal } from '@preact/signals';


export function getCurrentFullRoute(): string {
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    return routeFullState.value;
  }
  return readFullFromHash();
}

export type SplitRouteResult = {
  path: string;
  params: URLSearchParams;
};

/**
 * Splits "/a/b?x=1&y=2" -> { path: "/a/b", params }
 */
export function splitRoute(route: string): SplitRouteResult {
  const safe = (route ?? "").trim() || "/";

  const qIndex = safe.indexOf("?");
  if (qIndex < 0) {
    return { path: safe, params: new URLSearchParams() };
  }

  const path = safe.slice(0, qIndex) || "/";
  const query = safe.slice(qIndex + 1); // may be ""
  return { path, params: new URLSearchParams(query) };
}

/**
 * Builds "/a/b" + params -> "/a/b?x=1&y=2" (or "/a/b" if no params)
 */
export function buildRoute(path: string, params: URLSearchParams): string {
  const safePath = (path ?? "").trim() || "/";
  const qs = params.toString();
  return qs ? `${safePath}?${qs}` : safePath;
}

/**
 * Merge/update params. Pass null/undefined to remove a key.
 */
export function setQueryParams(
  currentRoute: string,
  updates: Record<string, string | number | boolean | null | undefined>,
  options?: { removeEmpty?: boolean }
): string {
  const { path, params } = splitRoute(currentRoute);

  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined) {
      params.delete(k);
      continue;
    }

    const s = String(v);
    if (options?.removeEmpty && s === "") params.delete(k);
    else params.set(k, s);
  }

  return buildRoute(path, params);
}

export function useSportsbookQuery(): URLSearchParams {
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    return routeQueryState.value;
  }
  return getSportsbookQuery();
}

export function getSportsbookQuery(): URLSearchParams {
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    return routeQueryState.value;
  }
  const full = readFullFromHash(); // "/event-view/live?tab=1"
  const q = full.indexOf("?");
  if (q < 0) return new URLSearchParams();
  const qs = full.slice(q + 1);
  return new URLSearchParams(qs);
}

/**
 * Hook to get and set query parameters
 * @returns An object with `params` (URLSearchParams) and `setParams` function
 */
// export function useQueryParams() {
//   const [location, setLocation] = useLocation();

//   // Get current full route based on routing type
//   const getCurrentFullRoute = useCallback((): string => {
//     if (locationHookType.value === 'useMemoryLocationWithHistory') {
//       return routeFullState.value;
//     }
//     return readFullFromHash();
//   }, []);

//   // Get current query params
//   const params = useMemo(() => {
//     return useSportsbookQuery();
//   }, [location]);

//   // Set query params
//   const setParams = useCallback((
//     updates: Record<string, string | number | boolean | null | undefined>,
//     options?: { replace?: boolean; removeEmpty?: boolean }
//   ) => {
//     const currentFullRoute = getCurrentFullRoute();
//     const newRoute = setQueryParams(currentFullRoute, updates, { removeEmpty: options?.removeEmpty });
//     setLocation(newRoute, { replace: options?.replace });
//   }, [setLocation, getCurrentFullRoute]);

//   const getParams = useCallback(() => {
//     return params;
//   }, [location]);

//   return {
//     getParams,
//     setParams,
//     getCurrentFullRoute
//   };
// }

/**
 * Hook to get and set query parameters
 * @returns An object with `params` (URLSearchParams) and `setParams` function
 */
export function useQueryParams() {
  const [location, setLocation] = useLocation();

  // Subscribe to signal changes for memory routing
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    useSignal(); // Subscribe to routeQueryState changes
  }

  // Get current query params
  const params = useMemo(() => {
    if (locationHookType.value === 'useMemoryLocationWithHistory') {
      return routeQueryState.value;
    }
    return getSportsbookQuery();
  }, [location]);

  // Set query params
  const setParams = useCallback((
    updates: Record<string, string | number | boolean | null | undefined>,
    options?: { replace?: boolean; removeEmpty?: boolean }
  ) => {
    const currentFullRoute = getCurrentFullRoute();
    const newRoute = setQueryParams(currentFullRoute, updates, { removeEmpty: options?.removeEmpty });
    setLocation(newRoute, { replace: options?.replace });
  }, [setLocation]);

  return {
    params,
    setParams,
  };
}

/**
 * Hook to get a specific query parameter value
 * Only re-renders when this specific param changes
 * @param key - The query parameter key to watch
 * @returns The value of the query parameter (or null if not present)
 */
export function useQueryParam(key: string): string | null {
  const [location, setLocation] = useLocation();
  
  // Subscribe to signal changes for memory routing
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    useSignal(); // Subscribe to routeQueryState changes
  }

  const value = useMemo(() => {
    let params: URLSearchParams;
    if (locationHookType.value === 'useMemoryLocationWithHistory') {
      params = routeQueryState.value;
    } else {
      params = getSportsbookQuery();
    }
    return params.get(key);
  }, [location, key]);

  const setValue = useCallback((
    newValue: string | number | boolean | null | undefined,
    options?: { replace?: boolean }
  ) => {
    const { setParams } = useQueryParams();
    setParams({ [key]: newValue }, options);
  }, [key]);

  return value;
}

/**
 * Hook to get multiple specific query parameters
 * Only re-renders when any of the watched params change
 * @param keys - Array of query parameter keys to watch
 * @returns Object with param values and setParams function
 */
export function useQueryParamsSelective(keys: string[]) {
  const [location, setLocation] = useLocation();
  
  // Subscribe to signal changes for memory routing
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    useSignal(); // Subscribe to routeQueryState changes
  }

  const selectedParams = useMemo(() => {
    let params: URLSearchParams;
    if (locationHookType.value === 'useMemoryLocationWithHistory') {
      params = routeQueryState.value;
    } else {
      params = getSportsbookQuery();
    }
    
    const result: Record<string, string | null> = {};
    keys.forEach(key => {
      result[key] = params.get(key);
    });
    return result;
  }, [location, keys.join(',')]); // Only re-render if location or watched keys change

  const setParams = useCallback((
    updates: Record<string, string | number | boolean | null | undefined>,
    options?: { replace?: boolean; removeEmpty?: boolean }
  ) => {
    const currentFullRoute = getCurrentFullRoute();
    const newRoute = setQueryParams(currentFullRoute, updates, { removeEmpty: options?.removeEmpty });
    setLocation(newRoute, { replace: options?.replace });
  }, [setLocation]);

  return {
    params: selectedParams,
    setParams,
  };
}