import { useEffect, useState } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { buildTopLeagueItems } from "@/helpers/topLeagueItems";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";

export const TopLeagueMenu = () => {
  const {
    isMobile,
    popularLeaguesState,
    summarySportsState,
    countsSummarySportsState,
    loadedSidebarState,
    baseColorTheme,
  } = useSportsbookStore();
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const baseTheme = baseColorTheme.value;

  const [sidebarNodes, setSidebarNodes] = useState(summarySportsState.value);
  const [sidebarLoaded, setSidebarLoaded] = useState(loadedSidebarState.value);

  useEffect(() => summarySportsState.subscribe(setSidebarNodes), []);
  useEffect(() => loadedSidebarState.subscribe(setSidebarLoaded), []);

  useEffect(() => {
    if (
      !sidebarLoaded ||
      !sidebarNodes.length ||
      countsSummarySportsState.value.preMatchCount.totalCount <= 0
    ) {
      popularLeaguesState.value = [];
      setLoading(!sidebarLoaded);
      return;
    }

    try {
      popularLeaguesState.value = buildTopLeagueItems(sidebarNodes);
    } catch (error) {
      console.error("Error building top league items:", error);
      popularLeaguesState.value = [];
    } finally {
      setLoading(false);
    }
  }, [
    sidebarLoaded,
    sidebarNodes,
    countsSummarySportsState.value.preMatchCount.totalCount,
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
      <div className="mt-3 w-full overflow-x-auto scrollbar-none">
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
    <div className="mt-3 w-full overflow-x-auto font-bold scrollbar-none">
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
            <div className="relative flex items-center justify-center rounded-md border border-[#FFFFFF20] p-1">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/logo/leagueById/${sport.id}/${league.id}.webp`}
                onError={(e) => {
                  e.currentTarget.src = getFlagIconFromregionName(region.name);
                  e.currentTarget.className = "h-4 w-4 rounded-full";
                }}
                alt=""
                className="h-5 w-5 shrink-0"
              />
              <div className="absolute -bottom-[6px] mx-auto rounded-full bg-[var(--background-element)] p-[1px]">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sport.id}.svg`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                    e.currentTarget.className = "h-4 w-4";
                  }}
                  alt=""
                  className={`h-[14px] w-[14px] ${baseTheme === "dark" ? "invert" : ""}`}
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
