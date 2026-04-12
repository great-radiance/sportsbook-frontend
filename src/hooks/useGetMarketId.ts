import { storeState } from "@/state/storeState";

/** Resolves market id from the event store by display name. Safe to call anywhere (not a hook). */
export function getMarketId({
  eventId,
  marketSlug,
  autoSelect = false,
}: {
  eventId: number;
  marketSlug: string;
  autoSelect?: boolean;
}): string {
  const event = storeState.value[eventId]?.value;
  const markets = event?.markets || [];
  if (autoSelect) {
    return (
      Object.values(markets).find((m) => m.value.name === marketSlug)?.value
        .id ??
      markets?.[0]?.value.id ??
      ""
    );
  }
  return (
    Object.values(markets).find((m) => m.value.name === marketSlug)?.value.id ??
    ""
  );
}
