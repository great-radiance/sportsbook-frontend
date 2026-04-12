import { instance } from "../instance";
import { SelectedOddType } from "@/shared/utils/bet";

export const apiGetBatchOdds = async (oddsArray: SelectedOddType[]) => {
  try {
    const selections = [];
    for (let i = 0; oddsArray.length > i; i++) {
      const odd = oddsArray[i];
      selections.push({
        oddsId: odd.oddsId,
        marketId: odd.marketId,
        eventId: odd.eventId,
      });
    }
    const response = await instance.post("/cybet/matches/batch-odds", {
      selections: selections,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching batch odds:", error);
    throw error;
  }
};
