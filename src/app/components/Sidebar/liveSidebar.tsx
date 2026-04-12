import { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { LiveSportsNavigation } from "@/app/components/Sidebar/components/LiveSportsNavigation";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useTranslate } from "@/shared/i18n/i18n";
import { liveScrollPos } from "@/state/liveScrollPos";
import { summarySportsLive } from "@/state/summarySports";

export const LiveSidebar: FunctionComponent = () => {
  const [groupByRegions, setGroupByRegions] = useState<boolean>(false);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState<boolean>(false);
  const timeFilterRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { t: tCommon } = useTranslate("common");
  const scrollPos = liveScrollPos.value;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || scrollPos === 0) return;
    el.scrollTop = scrollPos;
  }, [scrollPos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timeFilterRef.current &&
        !timeFilterRef.current.contains(event.target as Node)
      ) {
        setIsTimeFilterOpen(false);
      }
    };

    if (isTimeFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTimeFilterOpen]);

  return (
    <div className="flex flex-col min-h-0 w-full bg-[var(--background-element-dark)]">
      {/* Controls */}
      <div className="flex items-center py-2 gap-2">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/live.png`}
          className="w-[24px] h-[24px] object-contain"
        />
        <span className="text-[20px] font-bold text-[var(--text-basic-color-dark)]">
          {tCommon("liveMatches")}({summarySportsLive.value.liveTotalCount})
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex flex-col w-full flex-1 min-h-0 pr-[2px] rounded-[4px] gap-[2px] overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* {favoriteMatches.value.length > 0 && <FavoriteMatches />} */}

        <LiveSportsNavigation groupByRegions={groupByRegions} />
      </div>
    </div>
  );
};
