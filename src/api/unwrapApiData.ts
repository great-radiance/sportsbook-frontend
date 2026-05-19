/** Unwrap `{ data: T }` or return body as-is. */
export function unwrapApiData<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}
