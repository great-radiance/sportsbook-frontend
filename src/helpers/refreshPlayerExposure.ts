import { apiGetUsersMeExposure } from "@/api/user/apiUsersMe";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { playerExposure } = sportsbookStore;

export async function refreshPlayerExposure(): Promise<void> {
  try {
    playerExposure.value = await apiGetUsersMeExposure();
  } catch {
    /* exposure optional — limits still apply */
  }
}
