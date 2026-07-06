import { getAppConfig } from "@/shared/config/appConfig";

/** Default `lang` query param for sportsbook GET requests. */
export function apiLangParams(): { lang: string } {
  const { lang } = getAppConfig();
  return { lang: lang ?? "en" };
}
