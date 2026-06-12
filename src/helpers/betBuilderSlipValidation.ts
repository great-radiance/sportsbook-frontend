import {
  apiBetBuilderPrice,
  betBuilderRejectMessage,
  isBetBuilderCombinable,
} from "@/api/bet/apiBetBuilderPrice";
import type { SelectedOddType } from "@/shared/utils/bet";

export const BET_BUILDER_SEGMENT_ID = 2359;

export async function verifyBetBuilderGroup(
  eventId: number,
  selections: SelectedOddType[],
): Promise<
  { combinable: true; price: number } | { combinable: false; message: string }
> {
  if (selections.length < 2) {
    return { combinable: true, price: 1 };
  }

  try {
    const result = await apiBetBuilderPrice({
      // requestId: crypto.randomUUID(),
      // segmentId: BET_BUILDER_SEGMENT_ID,
      eventId,
      bets: selections.map((b) => ({
        marketId: b.apiMarketId ?? b.marketId,
        selectionId: b.apiSelectionId ?? Number(b.oddsId),
      })),
    });

    if (isBetBuilderCombinable(result) && typeof result.price === "number") {
      return { combinable: true, price: result.price };
    }

    return {
      combinable: false,
      message: betBuilderRejectMessage(result.rejectInfo),
    };
  } catch {
    return {
      combinable: false,
      message: "Could not load bet builder price",
    };
  }
}
