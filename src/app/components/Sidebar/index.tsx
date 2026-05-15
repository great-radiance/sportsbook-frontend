import { FunctionComponent } from "preact";
import { isMobile } from "@/state/isMobile";
import { LiveSidebar } from "@/app/components/Sidebar/liveSidebar";
import { PrematchSportsNavigation } from "./components/PrematchSportsNavigation";
import {
  outRightSummarySports,
  summarySports,
  summarySportsLive,
} from "@/state/summarySports";
import { SpecialNavigation } from "@/app/components/Sidebar/components/SpecialNavigation";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useCallback, useEffect, useState } from "preact/hooks";
import { PrematchLoader } from "../Loading/PrematchLoader";
import { loadedSidebarState } from "@/state/loadedSidebarState";
import { MiniMatchLoader } from "../Loading";
import { isOpenedSidebar } from "@/state/isOpenedSidebar";
import { apiGetSidebar, withPrematchSidebarFeatured } from "@/api/sidebar/apiGetSidebar";
import { useOrderConfig } from "@/hooks/useOrderConfig";
import { loadedSportsbookState } from "@/state/loadedSportsbookState";

export const Sidebar: FunctionComponent = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { pageName } = useRouteParams();

  useEffect(() => {
    (async () => {
      if (loadedSidebarState.value) return;
      try {
        setLoading(true);
        const [
          // res,
          res1,
          res2,
          res3,
          //  configRes
        ] = await Promise.all([
          // apiGetStoiximanSidebar(),
          apiGetSidebar({
            status: [1, 2],
            tradingStatus: 0,
            isOutright: false,
          }),
          apiGetSidebar({
            status: [3],
            tradingStatus: 0,
            isOutright: false,
          }),
          apiGetSidebar({
            status: [1, 2],
            tradingStatus: 0,
            isOutright: true,
          }),
          // apiGetOutright(),
          // apiGetOrderConfigration(),
        ]);
        // stoiximanSidebarState.value = res;
        summarySports.value = res1;
        summarySportsLive.value = withPrematchSidebarFeatured(res1, res2);
        outRightSummarySports.value = withPrematchSidebarFeatured(res1, res3);
        // orderConfigState.value = configRes;
        setLoading(false);
        useOrderConfig({
          includeRegionPlaceholders: true,
        });
      } catch (error) {
        console.error("Error fetching summary or oders:", error);
        setLoading(false);
      } finally {
        setLoading(false);
        loadedSidebarState.value = true;
        loadedSportsbookState.value = true;
      }
    })();
  }, []);

  const fetchSidebar = useCallback(async () => {
    if (loading) return;
    try {
      const [res, res2] = await Promise.all([
        // apiGetPrematchSidebar(),
        apiGetSidebar({
          status: [1, 2],
          tradingStatus: 0,
          isOutright: false,
        }),
        apiGetSidebar({
          status: [3],
          tradingStatus: 0,
          isOutright: false,
        }),
      ]);
      summarySports.value = res;
      summarySportsLive.value = withPrematchSidebarFeatured(res, res2);
    } catch (error) {
      console.error("Error fetching summary or oders:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchSidebar();
      },
      60 * 1000 * 5,
    );
    return () => clearInterval(interval);
  }, [fetchSidebar]);

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
            : `text-[12px] shrink-0 ${
                pageName === "live" ? "w-[320px]" : "lg:w-[210px]"
              }`
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
          // <></>
          <LiveSidebar />
        )
      ) : (
        <>
          {/* Navigation Items */}
          <div className="flex flex-col w-full flex-1 min-h-0 pr-[2px] rounded-[4px] gap-[2px] overflow-y-auto scrollbar-none">
            {/* {favoriteMatches.value.length > 0 && <FavoriteMatches />} */}

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
