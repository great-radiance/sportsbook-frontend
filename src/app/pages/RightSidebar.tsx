import { FavoritesBox } from "@/app/components/FavoritesBox";
import { BetSlip } from "@/app/components/BetSlip";
import { StateScoreBoard } from "@/app/components/StateScoreBoard";
import { FunctionComponent } from "preact";
import { OpenBets } from "../components/BetSlip/OpenBets";
import { isMobile } from "@/state/isMobile";
import { useEffect, useRef, useState } from "preact/hooks";
import { useRouteParams } from "@/hooks/useRotueParams";
import { loadedSidebarState } from "@/state/loadedSidebarState";

export const RightSidebar: FunctionComponent = () => {
  const { pageName, regionName, leagueName, eventId } = useRouteParams();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const BOTTOM_OFFSET_PX = !isMobile.value ? 0 : 70;
  const [bottom, setBottom] = useState<number>(BOTTOM_OFFSET_PX);

  useEffect(() => {
    if (isMobile.value) return;
    const recalculateBottom = () => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();

      const visibleBottom =
        rect.bottom - Math.min(window.innerHeight, rect.top + rect.height);
      setBottom(visibleBottom + BOTTOM_OFFSET_PX);
    };

    recalculateBottom();
    const el = sidebarRef.current;
    window.addEventListener("scroll", recalculateBottom, { passive: true });
    window.addEventListener("resize", recalculateBottom);
    el?.addEventListener("scroll", recalculateBottom);
    return () => {
      window.removeEventListener("scroll", recalculateBottom);
      window.removeEventListener("resize", recalculateBottom);
      el?.removeEventListener("scroll", recalculateBottom);
    };
  }, [
    isMobile.value,
    regionName,
    leagueName,
    eventId,
    pageName,
    loadedSidebarState.value,
  ]);

  return (
    <div ref={sidebarRef} className="relative flex flex-col w-full h-full">
      <div className="flex flex-col w-full h-full overflow-y-auto">
        {pageName === "live" && !isMobile.value && (
          //   className="relative flex flex-col w-full h-[480px]"
          //   style={{ scrollbarWidth: "none" }}
          // >
          // <div className="absolute inset-0 w-full h-full bg-black/40" />
          <StateScoreBoard />
          // </div>
        )}
        <OpenBets />
      </div>
      {/* <div
        className="absolute hidden md:flex left-0 z-[100] right-0"
        style={{
          bottom: `${bottom}px`,
        }}
      >
        <BetSlip />
      </div> */}
    </div>
  );
};
