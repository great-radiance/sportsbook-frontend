import { isMobile } from "@/state/isMobile";
import { popularLeaguesState } from "@/state/popularLeaguesState";
import {
  countsSummarySportsState,
  summarySportsState,
} from "@/state/summarySports";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { buildTopLeagueItems } from "@/helpers/topLeagueItems";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { baseColorTheme } from "@/state/baseColorTheme";

export const TopLeagueMenu = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();
  const baseTheme = baseColorTheme.value;

  useEffect(() => {
    const summary = summarySportsState.value;
    if (
      !summary?.length ||
      countsSummarySportsState.value.preMatchCount.totalCount <= 0
    ) {
      popularLeaguesState.value = [];
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      popularLeaguesState.value = buildTopLeagueItems(summarySportsState.value);
      console.log("popularLeaguesState.value", popularLeaguesState.value);
    } catch (error) {
      console.error("Error building top league items:", error);
      popularLeaguesState.value = [];
    } finally {
      setLoading(false);
    }
  }, [
    summarySportsState.value,
    countsSummarySportsState.value.preMatchCount.totalCount,
    featuredLeaguesState.value,
    isMobile.value,
  ]);

  const leagueItems = popularLeaguesState.value;

  const onLeagueClick = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const fullUrl = `${window.location.origin}${window.location.pathname}#sportsbook=${path}`;
      window.open(fullUrl, "_blank");
    } else {
      setLocation(path);
    }
  };

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
        {leagueItems.map(({ sport, league, region, path }) => (
          <button
            key={`${sport.id}-${league.id}-${region.id}`}
            type="button"
            onClick={(e) => onLeagueClick(e, path)}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-center rounded-md border border-[#FFFFFF20] p-1 relative">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sport.id}/${league.id}.webp`}
                onError={(e) => {
                  e.currentTarget.src = getFlagIconFromregionName(region.name);
                  e.currentTarget.className = "rounded-full w-4 h-4";
                }}
                alt=""
                className={`h-5 w-5 shrink-0`}
              />
              <div className="absolute -bottom-[6px] rounded-full mx-auto p-[1px] bg-[var(--background-element)]">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sport.id}.svg`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                    e.currentTarget.className = "w-4 h-4";
                  }}
                  alt=""
                  className={`w-[14px] h-[14px] ${baseTheme === "dark" ? "invert" : ""}`}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span className="block text-[var(--text-primary-color)]">
                {league.name}
              </span>
              <span className="text-[var(--text-basic-color)]">
                {region.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
