import { instance } from "../instance";
import { tMarket } from "@/types/tMarket";

// if endpoint require eventType: number, then 1 is inPlay and 2 is preGame.
// when required data type of eventType is a string, then you can send with inPlay and preGame
export const apiGetMarketsDetails = async (
  eventType: "inPlay" | "preGame",
  slugs: string[],
) => {
  const res = await instance.post<tMarket[]>(
    `/bff/event-view/${eventType === "inPlay" ? "in-play" : "pre-match"}/sidebar/matches/market-details`,
    {
      eventType,
      marketSlugs: slugs,
    },
  );
  return res.data;
};
