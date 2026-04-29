import slugify from "slugify";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

/**
 * Returns a convention-based URL for a league logo.
 * When no logo URL is provided by the API, you can place images at:
 * {BASE_ASSET_PUBLIC_URL}/stoiximan/leagueicons/{sport}/{leagueSlug}.png
 * e.g. leagueicons/Soccer/premier-league.png
 * If the image does not exist, use onError to fallback to region flag or sport icon.
 */
export function getLeagueLogoUrl(
  sport: string,
  region: string,
  league: string,
): string {
  return `${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sport || "")}/${encodeURIComponent(region || "")}/${encodeURIComponent(league || "")}.webp`;
}
