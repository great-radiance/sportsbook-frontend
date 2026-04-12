import { BetItemType } from "@/shared/utils/bet";
import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";

export interface BetHistoryResponseDto {
  bets: BetItemType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BetHistoryQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
}

export const apiGetBetHistory = async (
  params?: BetHistoryQueryParams,
): Promise<BetHistoryResponseDto | null> => {
  try {
    const response = await instance.get<BetHistoryResponseDto>(
      `/cybet/bets/history`,
      {
        params: {
          ...params,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error getting bet history:", error);
    return null;
  }
};
