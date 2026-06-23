import { instance } from "../instance";
import { unwrapApiData } from "../unwrapApiData";

export type ReferSportOrderResponse = {
  sportId: number;
  order: number[];
};

export async function apiGetLeagueOrder(
  sportId: number,
): Promise<ReferSportOrderResponse> {
  const { data } = await instance.get<
    ReferSportOrderResponse | { data: ReferSportOrderResponse }
  >(`users/refer/leagues/${sportId}/order`);
  return unwrapApiData<ReferSportOrderResponse>(data);
}

export async function apiGetMarketOrder(
  sportId: number,
): Promise<ReferSportOrderResponse> {
  const { data } = await instance.get<
    ReferSportOrderResponse | { data: ReferSportOrderResponse }
  >(`users/refer/markets/${sportId}/order`);
  return unwrapApiData<ReferSportOrderResponse>(data);
}

export async function apiGetLiveMarketOrder(
  sportId: number,
): Promise<ReferSportOrderResponse> {
  const { data } = await instance.get<
    ReferSportOrderResponse | { data: ReferSportOrderResponse }
  >(`users/refer/markets/${sportId}/live-order`);
  return unwrapApiData<ReferSportOrderResponse>(data);
}
