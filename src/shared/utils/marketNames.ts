export const MARKET_NAMES: string[] = ["Winner"];

export type MarketName = (typeof MARKET_NAMES)[number];

export type MarketNavOption = {
  label: string;
  value: string;
};

export const MARKET_NAV_OPTIONS: string[] = MARKET_NAMES.map((name) => name);

export const POPULAR_MARKET_NAV_OPTIONS: MarketNavOption[] = [
  { label: "Winner", value: "winner" },
  { label: "Total", value: "total" },
  { label: "Handicap", value: "handicap" },
];
