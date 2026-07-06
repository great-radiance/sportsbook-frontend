import { instance } from "@/api/instance";
import { apiLangParams } from "@/api/apiLangParams";

export type OperatorBranding = {
  printTicketWithLogo: boolean;
  logoUrl: string | null;
  printTicketWidthMm: number;
};

export async function apiGetOperatorBranding(): Promise<OperatorBranding> {
  const res = await instance.get<{ data: OperatorBranding }>(
    "users/operator/branding",
    { params: apiLangParams() },
  );
  return res.data.data;
}
