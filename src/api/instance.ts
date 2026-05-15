import axios from "axios";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export const setAxiosAuthToken = (
  apiId: string | null | undefined,
  apiCode: string | null | undefined,
  apiUserId: string | null | undefined,
) => {
  if (apiId) {
    instance.defaults.headers["X-API-ID"] = apiId;
  } else {
    delete instance.defaults.headers["X-API-ID"];
  }

  if (apiCode) {
    instance.defaults.headers["X-API-KEY"] = apiCode;
  } else {
    delete instance.defaults.headers["X-API-KEY"];
  }

  if (apiUserId) {
    instance.defaults.headers["x-user-id"] = apiUserId;
  } else {
    delete instance.defaults.headers["x-user-id"];
  }
};

/** Player JWT — attach only for routes that require `Authorization: Bearer` (see integration guide). */
export const setSportsbookUserJwt = (token: string | null | undefined) => {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
};
