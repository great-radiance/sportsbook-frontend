import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";

export interface BalanceItem {
  id: number;
  type: "cash" | "bonus";
  currency: string;
  amount: number;
}

export interface BalanceResponseDto {
  userId: string;
  userName: string;
  balance: BalanceItem[];
}

export const apiGetBalance = async () => {
  try {
    
    const { xApiKey, xUserId } = getAppConfig();
    const myHeaders = new Headers();
    myHeaders.append("x-api-key", xApiKey || '');
    myHeaders.append("x-user-id", xUserId || '');

    const requestOptions: RequestInit = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow" 
    };

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bets/get-balance`, requestOptions as RequestInit);
    const data = await res.json();
    return data as BalanceResponseDto;
  } catch (error) {
    console.error("Error getting balance:", error);
    return null;
  }
};
