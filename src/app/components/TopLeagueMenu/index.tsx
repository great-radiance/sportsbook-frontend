import { isMobile } from "@/state/isMobile";
import { popularLeaguesState } from "@/state/popularLeaguesState";
import { summarySports } from "@/state/summarySports";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { buildFeaturedLeaguesFromSummary } from "@/helpers/featuredLeaguesFromSummary";

type LeagueItem = { sport: string; region: string; league: string };

export const TopLeagueMenu = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isMobile.value) {
      setLoading(false);
      return;
    }
    if (Object.keys(popularLeaguesState.value).length > 0) {
      setLoading(false);
      return;
    }
    const summary = summarySports.value;
    if (!summary?.data?.length || summary.TotalCount <= 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      popularLeaguesState.value = buildFeaturedLeaguesFromSummary(summary);
    } catch (error) {
      console.error("Error building featured leagues:", error);
      popularLeaguesState.value = {};
    } finally {
      setLoading(false);
    }
  }, [
    summarySports.value.data,
    summarySports.value.TotalCount,
    isMobile.value,
  ]);

  const leagueItems = useMemo((): LeagueItem[] => {
    const items: LeagueItem[] = [];
    const state = popularLeaguesState.value;
    for (const sport of Object.keys(state)) {
      for (const region of Object.keys(state[sport] ?? {})) {
        for (const league of state[sport][region] ?? []) {
          items.push({ sport, region, league });
        }
      }
    }
    return items;
  }, [popularLeaguesState.value]);

  const onLeagueClick = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
      window.open(fullUrl, "_blank");
    } else {
      setLocation(path);
    }
  };

  if (!isMobile.value) return null;

  if (loading) {
    const skeletonCount = 8;
    return (
      <div className="w-full overflow-x-auto mt-3 scrollbar-none">
        <div
          className="grid gap-2 py-2 pr-3"
          style={{
            gridTemplateRows: "repeat(2, auto)",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(140px, 1fr)",
          }}
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5"
            >
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-white/10" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leagueItems.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto mt-3 font-bold scrollbar-none">
      <div
        className="grid gap-2 py-2 pr-3"
        style={{
          gridTemplateRows: "repeat(2, auto)",
          gridAutoFlow: "column",
          gridAutoColumns: "minmax(140px, 1fr)",
        }}
      >
        {leagueItems.map(({ sport, region, league }) => (
          <button
            key={`${sport}-${region}-${league}`}
            type="button"
            onClick={(e) =>
              onLeagueClick(
                e,
                `/event-view/pre-match/${sport}/${region}/${league}`,
              )
            }
            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-center rounded-md border border-[#FFFFFF20] p-1">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(sport)}/${encodeURIComponent(region)}/${encodeURIComponent(league)}.webp`}
                onError={(e) => {
                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-league-logo.jpg`;
                }}
                alt=""
                className={`h-5 w-5 shrink-0`}
              />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span className="block text-[var(--text-primary-color)]">
                {league}
              </span>
              <span className="text-[var(--text-basic-color)]">
                {region}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
