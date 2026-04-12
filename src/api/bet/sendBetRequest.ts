import { betRequestType } from "@/shared/utils/bet";
import { instance } from "@/api/instance";

export async function sendBetRequestCybet(placeBetRequest: betRequestType) {
  const response = await instance.post(`/cybet/bets`, placeBetRequest);
  return response.data;
}

