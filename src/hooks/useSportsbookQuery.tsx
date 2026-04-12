import { locationHookType } from '@/state/locationHookType';
import { readFullFromHash } from '../app/router/ShadowLocation';
import { routeQueryState } from '@/state/routeState';

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
