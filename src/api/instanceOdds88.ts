import axios from "axios";

export const instanceOdds88 = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export const setAxiosAuthToken = (
  apiKey: string | null | undefined,
  apiCode: string | null | undefined,
  apiUserId: string | null | undefined,
) => {
  if (apiKey) {
    instanceOdds88.defaults.headers["x-api-key"] = apiKey;
  } else {
    delete instanceOdds88.defaults.headers["x-api-key"];
  }

  if (apiCode) {
    instanceOdds88.defaults.headers["x-api-code"] = apiCode;
  } else {
    delete instanceOdds88.defaults.headers["x-api-code"];
  }

  if (apiUserId) {
    instanceOdds88.defaults.headers["x-user-id"] = apiUserId;
  } else {
    delete instanceOdds88.defaults.headers["x-user-id"];
  }
};
