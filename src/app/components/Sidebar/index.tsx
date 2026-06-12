import { FunctionComponent } from "preact";
import { isMobile } from "@/state/isMobile";
import { LiveSidebar } from "@/app/components/Sidebar/liveSidebar";
import { PrematchSportsNavigation } from "./components/PrematchSportsNavigation";

import { SpecialNavigation } from "@/app/components/Sidebar/components/SpecialNavigation";
import { BetBuilderSidebarToggle } from "@/app/components/Sidebar/components/BetBuilderSidebarToggle";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useEffect, useState } from "preact/hooks";
import { PrematchLoader } from "../Loading/PrematchLoader";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { MiniMatchLoader } from "../Loading";
import { isOpenedSidebar } from "@/state/isOpenedSidebar";
import { apiGetSidebar } from "@/api/sidebar/apiGetSidebar";
import {
  countsSummarySportsState,
  summarySportsState,
} from "@/state/summarySports";
import { popularMatchesState } from "@/state/popularMatchesState";
import { apiGetPopularMatches } from "@/api/matches/apiGetPopularMatches";
import { modeBySport } from "@/shared/config/appConfig";
import { loadedLiveState } from "@/state/loadedLiveState";
import { apiGetLiveSidebar } from "@/api/sidebar/apiGetLiveSidebar";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";

export const Sidebar: FunctionComponent = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { pageName } = useRouteParams();

  useEffect(() => {
    (async () => {
      try {
        // setLoading(true);
        if (pageName === "live") {
          if (loadedLiveState.value) return;
          await apiGetLiveSidebar();
          loadedLiveState.value = true;
        } else {
          if (loadedSidebarState.value) return;
          const { data, countsSummary } = await apiGetSidebar();
          summarySportsState.value = data;
          countsSummarySportsState.value = countsSummary;
        }
      } catch (error) {
        console.error("Error fetching summary or oders:", error);
        setLoading(false);
        if (pageName === "live") {
          loadedLiveState.value = true;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [pageName]);

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const featured = await apiGetPopularMatches();
        popularMatchesState.value = featured.data
          // .filter((event) => modeBySport[event.eventInfo.sport.id ?? 0])
          .slice(0, 20);
        for (const match of popularMatchesState.value) {
          storeEvent(match);
        }
        storeState.value = { ...storeState.value };
      } catch (error) {
        console.error("Error fetching popular matches:", error);
      } finally {
        loadedSidebarState.value = true;
      }
    })();
  }, [loading]);

  // useEffect(() => {
  //   const interval = setInterval(
  //     () => {
  //       fetchSidebar();
  //     },
  //     60 * 1000 * 5,
  //   );
  //   return () => clearInterval(interval);
  // }, [fetchSidebar]);

  if (isMobile.value && !isOpenedSidebar.value) return null;

  return (
    <div
      className={`flex flex-col px-1 md:px-1 z-[25]
        ${isMobile.value ? "absolute right-0 left-0 min-h-screen" : "md:relative md:min-h-screen"}
        text-[var(--text-basic-color)]
        ${
          pageName === "live" && !isMobile.value
            ? "bg-[var(--background-color)]"
            : "bg-[var(--sub-element-color)]"
        }
        ${
          isMobile.value
            ? "text-[14px]"
            : `text-[12px] shrink-0 w-full 
          ${pageName === "live" ? "max-w-[320px] min-w-[320px]" : "md:w-[210px]"}
              `
        }`}
    >
      {pageName === "live" && !isMobile.value ? (
        loading ? (
          <div className="flex flex-col w-full gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <MiniMatchLoader key={index} />
            ))}
          </div>
        ) : (
          <LiveSidebar />
          // <></>
        )
      ) : (
        <>
          <div className="flex flex-col w-full flex-1 min-h-0 pr-[2px] rounded-[4px] gap-[2px] overflow-y-auto scrollbar-none">
            <BetBuilderSidebarToggle />
            <SpecialNavigation />
            {loading ? (
              <PrematchLoader
                sportsCount={3}
                regionsPerSport={5}
                competitionsPerRegion={2}
              />
            ) : (
              <PrematchSportsNavigation />
            )}
          </div>
        </>
      )}
    </div>
  );
};
