import { getAppConfig } from "@/shared/config/appConfig";
import { instance } from "../instance";
export async function apiGetMaxBet() {
  const response = await instance.post("users/bets/max-bet", {
    currency: getAppConfig().currency,
    selections: [],
  });
  return response.data;
}
