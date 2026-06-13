import { FunctionComponent } from "preact";
import { Sidebar } from "@/app/components/Sidebar";
import { FavoritesBox } from "@/app/components/FavoritesBox";
import { BetSlip } from "@/app/components/BetSlip";
import { MarketsBoard } from "@/app/components/MarketsBoard";
import { useTranslate } from "@/shared/i18n/i18n";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useRouteParams } from "@/hooks/useRotueParams";
import { useMemo } from "preact/hooks";
import { SwitchMachesBoard } from "./SwitchMachesBoard";
import { useSpecialNavigationItems } from "@/hooks/useSpecialNavigationItems";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";

const NomalView: FunctionComponent = () => {
  const { t: tAlt } = useTranslate("alt");
  const { t: tCommon } = useTranslate("common");
  const { pageName, sportName, regionName, leagueName, eventId } =
    useRouteParams();
  const specialNavigationItems = useSpecialNavigationItems();

  const showSideBar = useMemo(() => {
    if (pageName === "pre-match" && !leagueName) {
      return true;
    }

    if (pageName === "live") {
      return !eventId;
    }

    if (pageName === "special") {
      return !eventId;
    }

    return false;
  }, [pageName, eventId, leagueName, sportName]);

  const showMatchesBoard = useMemo(() => {
    if (pageName === "pre-match" && leagueName) {
      return !eventId;
    }

    if (
      pageName === "special" &&
      specialNavigationItems.find((item) => item.id === sportName)?.isExpandable
    ) {
      return false;
    }

    if (pageName === "special") {
      return !eventId;
    }

    return false;
  }, [pageName, leagueName, specialNavigationItems, eventId]);

  const showMarketsBoard = useMemo(() => {
    if (eventId) {
      return true;
    }

    return false;
  }, [pageName, eventId]);

  return (
    <div className="w-full bg-[var(--background-color)]">
      <div
        className="bg-[var(--background-color)] flex flex-col w-full overflow-y-auto"
        style={{
          display: showSideBar ? "flex" : "none",
        }}
      >
        <div className="w-full px-2 pt-[10px]">
          <FavoritesBox />
        </div>
        <div className="w-full">
          <Sidebar />
        </div>
      </div>
      <div
        className="bg-[var(--background-color)] flex flex-col w-full"
        style={{
          display: showMatchesBoard ? "flex" : "none",
        }}
      >
        <div
          className="bg-[var(--background-color)] flex gap-2 px-[10px] pt-5 pb-2 items-center justify-start w-full shrink-0"
          onClick={() => {
            window.history.back();
          }}
        >
          <div className="bg-white/60 rounded-full">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className="rotate-180 brightness-0 w-[20px]"
              alt={tAlt("arrowRight")}
            />
          </div>
          <span className="text-[14px] font-medium">
            {specialNavigationItems.find((item) => item.id === sportName)
              ?.name || tCommon("back")}
          </span>
        </div>
        <div className="px-2">
          <SwitchMachesBoard />
        </div>
      </div>
      <div
        className="pb-[60px] bg-[var(--background-color)] flex flex-col w-full"
        style={{
          display: showMarketsBoard ? "flex" : "none",
        }}
      >
        <div
          className="flex gap-2 px-[10px] pt-5 pb-2 items-center justify-start w-full"
          onClick={() => {
            window.history.back();
          }}
        >
          <div className="bg-white/60 rounded-full">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className="rotate-180 brightness-0 w-[20px]"
              alt={tAlt("arrowRight")}
            />
          </div>
          <span className="text-[14px] font-medium">
            {leagueName || tCommon("back")}
          </span>
        </div>
        <MarketsBoard />
      </div>
    </div>
  );
};

export const EventviewForMobile: FunctionComponent = () => {
  const { bottomLayoutHeight } = useSportsbookStore();
  return (
    <div className="flex flex-col h-full bg-[var(--background-color)] overflow-y-auto scrollbar-none">
      <NomalView />
      <div
        className="fixed right-0 left-0 z-[50] w-full max-w-screen overflow-y-auto scrollbar-none"
        style={{
          maxHeight: "-webkit-fill-available",
          bottom: bottomLayoutHeight.value + "px",
        }}
      >
        <BetSlip />
      </div>
    </div>
  );
};
