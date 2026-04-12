import { computed } from "@preact/signals";
import { routeFullState } from "./routeState";

// Parse eventId from URL path: /event-view/:pageName/:sportName/:sportId/:regionName/:regionId/:competitionName/:competitionId/:eventId
export const selectedEvent = computed<number | undefined>(() => {
  // Access routeFullState directly to ensure reactivity
  const full = routeFullState.value;
  
  // Extract pathname (remove query and hash)
  const q = full.indexOf("?");
  const h = full.indexOf("#");
  const cut = [q, h].filter(i => i >= 0).sort((a,b)=>a-b)[0];
  const path = cut != null ? full.slice(0, cut) : full;
  
  // Split path into segments
  const segments = path.split('/').filter(Boolean);
  const eventViewIndex = segments.indexOf('event-view');
  
  // Check if we're on an event-view route with all required segments
  if (eventViewIndex >= 0 && segments.length >= eventViewIndex + 9) {
    // segments structure: [event-view, pageName, sportName, sportId, regionName, regionId, competitionName, competitionId, eventId]
    const eventIdStr = segments[eventViewIndex + 8];
    if (eventIdStr) {
      const eventId = Number(eventIdStr);
      return isNaN(eventId) ? undefined : eventId;
    }
  }
  
  return undefined;
});