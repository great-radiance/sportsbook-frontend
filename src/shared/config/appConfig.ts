import { setAxiosAuthToken } from "@/api/instance";
import { bottomLayoutHeight } from "@/state/bottomLayoutHeight";
import { baseColorTheme } from "@/state/baseColorTheme";

export interface AppConfig {
  host: string;
  cid: string;
  token?: string;
  lang: string;
  disallowUrlChange?: boolean;
  baseUrl?: string;
  operatorCode?: string;
  xApiId?: string;
  xApiKey?: string;
  xSportsbookToken?: string;
  xUserId?: string;
  xUserName?: string;
  xUserBalance?: number;
  currency?: string;
  bottomLayoutHeight?: number;
  baseTheme?: string;
}

let currentConfig: AppConfig | null = null;

export function setAppConfig(cfg: AppConfig) {
  currentConfig = cfg;
  bottomLayoutHeight.value = cfg.bottomLayoutHeight ?? 64;
  setAxiosAuthToken(cfg.xApiId, cfg.xApiKey, cfg.xUserId);
  baseColorTheme.value = cfg.baseTheme === "light" ? "light" : "dark";
}

export function getAppConfig(): AppConfig {
  if (!currentConfig) {
    throw new Error("AppConfig not initialized");
  }
  return currentConfig;
}

export const baseUrl: string =
  "https://tekio.s3.eu-north-1.amazonaws.com/sportsbook";
export const BASE_ASSET_PUBLIC_URL =
  "https://tekio.s3.eu-north-1.amazonaws.com/cybet-sportsbook";
