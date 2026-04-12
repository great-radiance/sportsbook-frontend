// useSetQueryParams.ts

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
