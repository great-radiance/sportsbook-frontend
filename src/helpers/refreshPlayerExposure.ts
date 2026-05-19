import { apiGetUsersMeExposure } from "@/api/user/apiUsersMe";
import { playerExposure } from "@/state/betState";

export async function refreshPlayerExposure(): Promise<void> {
  try {
    playerExposure.value = await apiGetUsersMeExposure();
  } catch {
    /* exposure optional — limits still apply */
  }
}
