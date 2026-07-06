import { getAppConfig } from "@/shared/config/appConfig";

export function getSportsbookOperatorId(): string | undefined {
  const cfg = getAppConfig();
  return cfg.xOperatorId ?? cfg.xApiId;
}
