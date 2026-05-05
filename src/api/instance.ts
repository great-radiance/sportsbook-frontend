import axios from "axios";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL_NEW,
});

export const setAxiosAuthToken = (
  apiKey: string | null | undefined,
  apiCode: string | null | undefined,
  apiUserId: string | null | undefined,
) => {
  if (apiKey) {
    instance.defaults.headers["x-api-key"] = apiKey;
  } else {
    delete instance.defaults.headers["x-api-key"];
  }

  if (apiCode) {
    instance.defaults.headers["x-api-code"] = apiCode;
  } else {
    delete instance.defaults.headers["x-api-code"];
  }

  if (apiUserId) {
    instance.defaults.headers["x-user-id"] = apiUserId;
  } else {
    delete instance.defaults.headers["x-user-id"];
  }
};
