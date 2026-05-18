import { instance } from "../instance";

export type SportsbookBalanceResponse = {
  balance: number;
  currency: string;
  source?: string;
  note?: string;
};

export async function apiGetSportsbookBalance(): Promise<SportsbookBalanceResponse> {
  const { data } =
    await instance.get<SportsbookBalanceResponse>("/users/me/balance");
  return data;
}
