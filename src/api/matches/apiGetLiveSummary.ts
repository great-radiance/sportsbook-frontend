import { instance } from "../instance";

export const apiGetLiveSummary = async () => {
  const response = await instance.get<{ data: LiveSummaryResponse }>(
    "users/sidebar/live",
  );
  return response.data;
};
