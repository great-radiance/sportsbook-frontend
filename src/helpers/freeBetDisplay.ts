import type { ActiveFreeBet } from "@/api/bonuses/apiGetActiveBonus";

export function formatFreeBetExpiry(expiresAt: string, locale = "en"): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatApplicableBetTypes(
  types: ActiveFreeBet["applicableBetTypes"],
  labels: { single: string; parlay: string; both: string },
): string {
  const hasSingle = types.includes("single");
  const hasParlay = types.includes("parlay");
  if (hasSingle && hasParlay) return labels.both;
  if (hasParlay) return labels.parlay;
  return labels.single;
}
