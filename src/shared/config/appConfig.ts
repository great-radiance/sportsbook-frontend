import { setLanguageId, setPlayerSessionHeaders } from "@/api/instance";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { bottomLayoutHeight, baseColorTheme } = sportsbookStore;

export interface AppConfig {
  host: string;
  cid: string;
  token?: string;
  lang: string;
  disallowUrlChange?: boolean;
  baseUrl?: string;
  operatorCode?: string;
  /** Platform operator id — sent as `x-operator-id` (integration guide). */
  xOperatorId?: string;
  /** @deprecated Use `xOperatorId` */
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
  const operatorId = cfg.xOperatorId ?? cfg.xApiId;
  setPlayerSessionHeaders(cfg.xUserId, operatorId, cfg.currency);
  setLanguageId(cfg.lang);
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

export const modeBySport: Record<number, number> = {
  1: 10,
  8: 8,
  4: 6,
};
