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
  featuredLeaguesState,
  summarySportsState,
} from "@/state/summarySports";

export const Sidebar: FunctionComponent = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { pageName } = useRouteParams();

  useEffect(() => {
    (async () => {
      if (loadedSidebarState.value) return;
      try {
        setLoading(true);
        const { data, countsSummary, featuredLeagues } = await apiGetSidebar();
        // console.log(data, countsSummary, featuredLeagues);
        summarySportsState.value = data;
        countsSummarySportsState.value = countsSummary;
        featuredLeaguesState.value = featuredLeagues;
        console.log(
          "summarySportsState.value",
          summarySportsState.value,
          "countsSummarySportsState.value",
          countsSummarySportsState.value,
          "featuredLeaguesState.value",
          featuredLeaguesState.value,
        );
        // const [res1, res2, res3] = await Promise.all([
        //   apiGetSidebar({
        //     status: [1, 2],
        //     tradingStatus: 0,
        //     isOutright: false,
        //   }),
        //   apiGetSidebar({
        //     status: [3],
        //     tradingStatus: 0,
        //     isOutright: false,
        //   }),
        //   apiGetSidebar({
        //     status: [1, 2],
        //     tradingStatus: 0,
        //     isOutright: true,
        //   }),
        // ]);
        // summarySports.value = toSummaryTree(res1);
        // summarySportsLive.value = toSummaryTree(res2);
        // outRightSummarySports.value = toSummaryTree(res3);
        // syncFeaturedFromSidebars(res1, res2, res3);
      } catch (error) {
        console.error("Error fetching summary or oders:", error);
      } finally {
        setLoading(false);
        loadedSidebarState.value = true;
      }
    })();
  }, []);

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
          ${pageName === "live" ? "w-[320px]" : "md:w-[210px]"}
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
          // <LiveSidebar />
          <></>
        )
      ) : (
        <>
          <div className="flex flex-col w-full flex-1 min-h-0 pr-[2px] rounded-[4px] gap-[2px] overflow-y-auto scrollbar-none">
            <BetBuilderSidebarToggle />
            {/* <SpecialNavigation /> */}
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
