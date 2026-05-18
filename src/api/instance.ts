import axios from "axios";

export const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Player session headers (integration guide § Player Headers).
 * Required: `x-user-id`, `x-operator-id`. Optional: `x-currency`.
 * No `Authorization` header for platform player routes.
 */
export function setPlayerSessionHeaders(
  playerId: string | null | undefined,
  operatorId: string | null | undefined,
  currencyCode?: string | null,
) {
  if (playerId) {
    instance.defaults.headers["x-user-id"] = playerId;
  } else {
    delete instance.defaults.headers["x-user-id"];
  }

  if (operatorId) {
    instance.defaults.headers["x-operator-id"] = operatorId;
  } else {
    delete instance.defaults.headers["x-operator-id"];
  }

  if (currencyCode) {
    instance.defaults.headers["x-currency"] = currencyCode;
  } else {
    delete instance.defaults.headers["x-currency"];
  }

  delete instance.defaults.headers["X-API-ID"];
  delete instance.defaults.headers["X-API-KEY"];
  delete instance.defaults.headers.common["Authorization"];
}

/** @deprecated Use `setPlayerSessionHeaders`. */
export const setAxiosAuthToken = (
  operatorId: string | null | undefined,
  _apiKey: string | null | undefined,
  playerId: string | null | undefined,
) => {
  setPlayerSessionHeaders(playerId, operatorId);
};

/** Optional token for third-party feeds only (e.g. live animation), not platform APIs. */
export const setOptionalFeedAuth = (token: string | null | undefined) => {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
};

/** @deprecated Use `setOptionalFeedAuth`. */
export const setSportsbookUserJwt = setOptionalFeedAuth;
