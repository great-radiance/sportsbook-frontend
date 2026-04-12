// routeState.ts
import { signal, computed } from "@preact/signals";
export const routeState = signal<string>("/");

export const routeFullState = signal<string>("/"); // can include ?query
export const routePathState = computed(() => {
  const full = routeFullState.value;
  const q = full.indexOf("?");
  const h = full.indexOf("#");
  const cut = [q, h].filter(i => i >= 0).sort((a,b)=>a-b)[0];
  return cut != null ? full.slice(0, cut) : full;
});
export const routeQueryState = computed(() => {
  const full = routeFullState.value;
  const q = full.indexOf("?");
  if (q < 0) return new URLSearchParams();
  const end = full.indexOf("#", q);
  const qs = end >= 0 ? full.slice(q + 1, end) : full.slice(q + 1);
  return new URLSearchParams(qs);
});
