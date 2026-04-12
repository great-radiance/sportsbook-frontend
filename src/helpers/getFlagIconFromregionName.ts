import { regionFlagMap } from "@/shared/utils/flag";

export const getFlagIconFromregionName = (regionName: string) => {
  const regionNameLower = (regionName || "").toLowerCase().trim();
  return `https://flagcdn.com/w40/${
    regionFlagMap[regionNameLower] || "un"
  }.png`;
};
