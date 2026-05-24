import type { BetLegType } from "@/shared/utils/bet";
import type { Participant } from "@/shared/utils/types";
import type { BetDetailSelection } from "./apiBetDetail";

type EventSnapshot = NonNullable<BetDetailSelection["eventSnapshot"]>;

type SelectionSnapshot = NonNullable<BetDetailSelection["selectionSnapshot"]>;

function participantsFromEvent(
  ev?: EventSnapshot,
  eventName?: string,
): Participant[] {
  if (ev?.competitors?.length) {
    return ev.competitors.map((c, i) => ({
      seqId: i,
      id: c.id ?? null,
      name: c.name ?? "",
      providerId: 0,
      providerName: "",
      home: i === 0,
    }));
  }

  const title = (eventName ?? ev?.name ?? "").trim();
  const parts = title
    ? title.split(/\s+vs\s+/i).map((s) => s.trim()).filter(Boolean)
    : [];

  if (parts.length > 0) {
    return parts.map((name, i) => ({
      seqId: i,
      id: null,
      name,
      providerId: 0,
      providerName: "",
      home: i === 0,
    }));
  }

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

function oddsFromSelection(sel: BetDetailSelection) {
  const snap = sel.selectionSnapshot as SelectionSnapshot | undefined;
  const placement =
    sel.oddsAtPlacement ?? snap?.price ?? snap?.odds ?? 0;
  const current = sel.currentOdds ?? placement;
  const label =
    sel.selectionName?.trim() ||
    snap?.name?.trim() ||
    (sel.isBetBuilder ? "Bet Builder" : "—");

  return {
    id: String(sel.selectionId),
    name: label,
    value: placement,
    currentValue: current,
  };
}

/** Map history/detail selections (with or without snapshots) to bet-slip legs. */
export function mapSelectionsToBetLegs(
  selections?: BetDetailSelection[],
): BetLegType[] {
  if (!selections?.length) return [];

  return selections.map((sel) => {
    const ev = sel.eventSnapshot as EventSnapshot | undefined;
    const odd = oddsFromSelection(sel);
    const eventTitle = sel.eventName?.trim() || ev?.name?.trim() || "";

    return {
      eventId: sel.eventId,
      sport: { id: ev?.sport?.id ?? 0, name: ev?.sport?.name ?? "" },
      region: {
        seqId: 0,
        id: ev?.country?.id ?? null,
        name: ev?.country?.name ?? null,
      },
      league: {
        seqId: 0,
        id: ev?.competition?.id ?? null,
        name: ev?.competition?.name ?? null,
      },
      participants: participantsFromEvent(ev, eventTitle),
      market: {
        name:
          sel.marketName?.trim() ||
          sel.marketSnapshot?.name?.trim() ||
          (sel.isBetBuilder ? "Bet Builder" : ""),
      },
      isBetBuilder: Boolean(sel.isBetBuilder),
      betBuilderBetItems: (sel.betBuilderBetItems ?? []).map((item) => ({
        marketId: item.marketId,
        selectionId: item.selectionId,
        marketName: item.marketName,
        selectionName: item.selectionName,
      })),
      eventName: eventTitle || undefined,
      selectionDisplayName: odd.name,
      selectionStatus: sel.status,
      settlementResult: sel.settlementResult ?? null,
      eventStartTime: ev?.startTime,
      legPotentialPayout: sel.potentialPayout,
      odds: [
        {
          ...odd,
          selected: true,
          settlement: sel.settlementResult ?? null,
        },
      ],
    };
  });
}
