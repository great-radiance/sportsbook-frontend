import axios from "axios";
import { instance } from "../instance";

export type OperatorsLoginBody = {
  playerId: string;
  deviceId?: string;
  ip?: string;
  languageId: string;
};

export type OperatorsLoginResponse = {
  data: {
    playerId: string;
    username: string;
    currency: string;
    status: string;
  };
  token: string;
};

/** Operator headers only — never `Authorization` (guide: login is not a Bearer route). */
function operatorLoginHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const id = instance.defaults.headers["X-API-ID"];
  const key = instance.defaults.headers["X-API-KEY"];
  if (id != null && id !== "") h["X-API-ID"] = String(id);
  if (key != null && key !== "") h["X-API-KEY"] = String(key);
  return h;
}

/**
 * `POST /operators/auth/login` — operator auth only (`X-API-ID`, `X-API-KEY`).
 * Does not use the shared `instance` client so a stale `Authorization` default is never sent.
 */
export async function apiOperatorsAuthLogin(
  body: OperatorsLoginBody,
): Promise<OperatorsLoginResponse> {
  const baseURL = (instance.defaults.baseURL as string | undefined) || "";
  const { data } = await axios.post<OperatorsLoginResponse>(
    "/operators/auth/login",
    body,
    {
      baseURL: baseURL.replace(/\/+$/, "") || undefined,
      headers: operatorLoginHeaders(),
    },
  );
  return data;
}
