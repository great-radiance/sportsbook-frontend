import { sportsbookStore } from '@/state/sportsbookStoreContext';
import { readFullFromHash } from '../app/router/ShadowLocation';

const { locationHookType, routeQueryState } = sportsbookStore;

export function useSportsbookQuery(): URLSearchParams {
  if (locationHookType.value === 'useMemoryLocationWithHistory') {
    return routeQueryState.value;
  }
  return getSportsbookQuery();
}

export function getSportsbookQuery(): URLSearchParams {
  if (locationHookType.value === "useMemoryLocationWithHistory") {
    return routeQueryState.value;
  }
  if (locationHookType.value === "useBrowserLocation") {
    return new URLSearchParams(window.location.search);
  }
  const full = readFullFromHash(); // "/event-view/live?tab=1"
  const q = full.indexOf("?");
  if (q < 0) return new URLSearchParams();
  const qs = full.slice(q + 1);
  return new URLSearchParams(qs);
}
