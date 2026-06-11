import type { PlaceBetDescriptionItem } from "@/api/bet/placeBet";
import type { BetDetailSelection } from "./apiBetDetail";
import type { BetLegType } from "@/shared/utils/bet";
import type { Participant } from "@/shared/utils/types";
import { getOddsValue } from "@/helpers/getOddsValue";

function participantsFromDescription(
  items: PlaceBetDescriptionItem[],
): Participant[] {
  const source = items[0]?.participants ?? [];
  if (!source.length) {
    return [
      {
        seqId: 0,
        id: null,
        name: "—",
        providerId: 0,
        providerName: "",
      },
    ];
  }

  return source.map((p, i) => ({
    seqId: i,
    id: null,
    name: p.name ?? "",
    providerId: 0,
    providerName: "",
    home: p.home ?? i === 0,
  }));
}

function eventTitleFromDescription(items: PlaceBetDescriptionItem[]): string {
  const participants = items[0]?.participants ?? [];
  if (participants.length >= 2) {
    return `${participants[0]?.name ?? ""} - ${participants[1]?.name ?? ""}`;
  }
  return participants[0]?.name ?? items[0]?.name ?? "—";
}

function oddsForDescriptionItem(
  item: PlaceBetDescriptionItem,
  selections?: BetDetailSelection[],
): number {
  const selectionId = Number(item.oddsId);
  const matched = selections?.find(
    (sel) =>
      sel.eventId === item.eventId &&
      sel.marketId === item.marketId &&
      sel.selectionId === selectionId,
  );
  if (matched?.oddsAtPlacement) return matched.oddsAtPlacement;

  return (
    getOddsValue(item.eventId, item.marketId, selectionId) ??
    matched?.currentOdds ??
    1
  );
}

function selectionForEvent(
  eventId: number,
  selections?: BetDetailSelection[],
): BetDetailSelection | undefined {
  return selections?.find((sel) => sel.eventId === eventId);
}

function legFromDescriptionItem(
  item: PlaceBetDescriptionItem,
  itemsForEvent: PlaceBetDescriptionItem[],
  selections?: BetDetailSelection[],
): BetLegType {
  const matched = selectionForEvent(item.eventId, selections);
  const oddsValue = matched?.isBetBuilder
    ? matched.oddsAtPlacement
    : oddsForDescriptionItem(item, selections);

  return {
    eventId: item.eventId,
    sport: { id: item.sport.id, name: item.sport.name },
    region: {
      seqId: 0,
      id: item.region.id,
      name: item.region.name,
    },
    league: {
      seqId: 0,
      id: item.league.id,
      name: item.league.name,
    },
    participants: participantsFromDescription(itemsForEvent),
    market: { name: item.marketName },
    eventName: eventTitleFromDescription(itemsForEvent),
    selectionDisplayName: item.name,
    selectionStatus: matched?.status,
    settlementResult: matched?.settlementResult ?? null,
    eventStartTime: item.startDate
      ? new Date(item.startDate).toISOString()
      : matched?.eventSnapshot?.startTime,
    legPotentialPayout: matched?.potentialPayout,
    odds: [
      {
        id: item.oddsId,
        name: item.name,
        value: oddsValue,
        selected: true,
        currentValue: matched?.currentOdds ?? oddsValue,
        settlement: matched?.settlementResult ?? null,
      },
    ],
  };
}

/** Map stored slip `description` rows into bet-slip leg display models. */
export function mapDescriptionToBetLegs(
  description: PlaceBetDescriptionItem[] | undefined,
  selections?: BetDetailSelection[],
): BetLegType[] {
  if (!description?.length) return [];

  const byEvent = new Map<number, PlaceBetDescriptionItem[]>();
  for (const item of description) {
    const list = byEvent.get(item.eventId) ?? [];
    list.push(item);
    byEvent.set(item.eventId, list);
  }

  const legs: BetLegType[] = [];

  for (const [eventId, items] of byEvent) {
    const matched = selectionForEvent(eventId, selections);

    if (items.length >= 2 || matched?.isBetBuilder) {
      const first = items[0];
      const combinedOdds =
        matched?.oddsAtPlacement ??
        items.reduce(
          (acc, item) => acc * oddsForDescriptionItem(item, selections),
          1,
        );

      legs.push({
        ...legFromDescriptionItem(first, items, selections),
        isBetBuilder: true,
        betBuilderBetItems: items.map((item) => ({
          marketId: item.marketId,
          selectionId: Number(item.oddsId),
          marketName: item.marketName,
          selectionName: item.name,
        })),
        odds: [
          {
            id: "bb",
            name: "Bet Builder",
            value: combinedOdds,
            selected: true,
            currentValue: matched?.currentOdds ?? combinedOdds,
            settlement: matched?.settlementResult ?? null,
          },
        ],
      });
      continue;
    }

    legs.push(legFromDescriptionItem(items[0], items, selections));
  }

  return legs;
}
