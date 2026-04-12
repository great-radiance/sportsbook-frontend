import { instance } from "./instance";

export const apiGetMarketGroups = async (sportSlug: string) => {
  const res = await instance.get(`/cybet/markets/groups?sport=${sportSlug}`);
  return res.data;
};
