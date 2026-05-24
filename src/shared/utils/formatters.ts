import { getAppConfig } from "@/shared/config/appConfig";

// Date, currency, odds helpers
export function formatDate(date: string | Date | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  // Pass undefined to automatically use the device's locale, or use navigator.language for explicit locale
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export function formatCurrency(amount: number, currencyCode?: string): string {
  const { lang = "en-US", currency = "eur" } = getAppConfig();
  const code = (currencyCode ?? currency ?? "EUR").toUpperCase();

  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency: code,
  }).format(amount);
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}
