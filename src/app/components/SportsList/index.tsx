import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import { isMobile } from "@/state/isMobile";
import { FunctionComponent } from "preact";
import { useTranslate } from "@/shared/i18n/i18n";
// import { SportsListLoader } from "@/app/components/Loading";
import { summarySports, summarySportsLive } from "@/state/summarySports";
import { HorizontalTabs } from "../HorizontalTabs";
import { baseColorTheme } from "@/state/baseColorTheme";
import { SportsListLoader } from "../Loading";

interface SportsListProps {
  sportsData: { count: number; name: string; id: number }[];
  selectedSport: number;
  onSelectSport: (sport: number) => void;
  loading?: boolean;
  isLive?: boolean;
  showPopular?: boolean;
}

export const SportsList: FunctionComponent<SportsListProps> = ({
  sportsData,
  selectedSport,
  onSelectSport,
  loading = false,
  isLive = false,
  showPopular = false,
}) => {
  const { t: tCommon } = useTranslate("common");
  const baseTheme = baseColorTheme.value;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // start hidden to avoid "sometimes appears" before first measurement
  const [showLeftArrow, setShowLeftArrow] = useState<boolean>(false);
  const [showRightArrow, setShowRightArrow] = useState<boolean>(false);

  // `sportsData` is built by the parent panel and already carries a
  // pre-computed `count` (sum of event IDs per sport). Filtering on that is
  // both correct and avoids subscribing to `summarySports*.value.counts`,
  // which previously caused this memo to cache an empty result when the
  // counts signal had not yet populated.
  const filteredSports = useMemo(
    () => sportsData.filter((sport) => sport.count > 0),
    [sportsData],
  );

  const checkScrollPosition = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    // if content doesn't overflow, hide both
    const canScroll = scrollWidth > clientWidth + 1;

    if (!canScroll) {
      setShowLeftArrow(false);
      setShowRightArrow(false);
      return;
    }

    // small epsilon to reduce flicker on fractional pixels
    const EPS = 1;

    setShowLeftArrow(scrollLeft > EPS);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - EPS);
  };

  const scheduleMeasure = () => {
    // measure after paint; double rAF helps when icons/images affect width
    requestAnimationFrame(() => {
      requestAnimationFrame(() => checkScrollPosition());
    });
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Hide webkit scrollbar (keep your behavior)
    const style = document.createElement("style");
    style.textContent = `
      .sports-scroll::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(style);

    // Initial measure after mount/paint
    scheduleMeasure();

    const onScroll = () => checkScrollPosition();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });

    // Observe size changes of scroll container and its parent (parent width changes are common)
    const ro = new ResizeObserver(() => scheduleMeasure());
    ro.observe(scrollContainer);
    if (scrollContainer.parentElement)
      ro.observe(scrollContainer.parentElement);

    // Also react when images inside load (they can change scrollWidth)
    const imgs = Array.from(scrollContainer.querySelectorAll("img"));
    const onImgLoad = () => scheduleMeasure();
    imgs.forEach((img) => img.addEventListener("load", onImgLoad));

    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
      if (document.head.contains(style)) document.head.removeChild(style);
    };
    // run when the actual rendered list changes
  }, [filteredSports.length, selectedSport, isLive, isMobile.value]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.8;
    const newScrollLeft =
      el.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount);

    el.scrollTo({ left: newScrollLeft, behavior: "smooth" });

    // ensure arrows update even if smooth scroll doesn't fire immediately
    scheduleMeasure();
  };

  if (loading) {
    return <SportsListLoader sportsCount={6} />;
  }

  return (
    <div
      className={`relative flex w-full py-[10px] gap-0 font-bold items-center ${"text-[var(--text-basic-color)]"} rounded-full`}
    >
      {/* Left Arrow */}
      {/* {showLeftArrow && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollTabs("left");
          }}
          className={`absolute left-0 top-[14px] flex items-center justify-start w-14 shrink-0 z-[5] h-8
          }`}
          style={{
            background:
              "linear-gradient(to right, var(--background-color), #00000000)",
          }}
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            className="w-4 h-4 rotate-180 brightness-0 invert"
            alt={tAlt("scrollLeft")}
          />
        </button>
      )} */}

      {/* Scrollable Container */}
      {/* <div
        ref={scrollContainerRef}
        className="flex gap-[6px] overflow-x-auto pt-[4px] sports-scroll min-w-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      > */}
      <HorizontalTabs>
        <>
          {showPopular && (
            <div
              key="Popular"
              onClick={() => {
                onSelectSport(0);
                // selection can change layout slightly; re-measure
                scheduleMeasure();
              }}
              className={`relative flex ${
                selectedSport === 0 ? "bg-[var(--highlight-background)]" : ""
              } rounded-full px-2 py-1 gap-1 items-center justify-center cursor-pointer`}
              style={{
                order: 0,
                display: "flex",
              }}
            >
              <div className="w-[34px] h-[24px] flex items-center justify-center">
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/popular.png`}
                  onError={(e) => {
                    e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png`;
                  }}
                  className={`w-[28px] ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                  alt="Popular"
                />
              </div>

              <span className="text-[12px] truncate w-full block text-center">
                {tCommon("popular")}
              </span>
            </div>
          )}
          {filteredSports.map((sport) => {
            if (sport.count === 0) return null;
            return (
              <div
                key={sport.id}
                onClick={() => {
                  onSelectSport(sport.id);
                  // selection can change layout slightly; re-measure
                  scheduleMeasure();
                }}
                className={`relative flex ${
                  sport.id === selectedSport
                    ? "bg-[var(--highlight-background)]"
                    : ""
                } rounded-full px-2 py-1 gap-1 items-center justify-center cursor-pointer`}
                style={{
                  order: sport.id || 999,
                  display: "flex", // (summarySportsLive.value.config.find(
                  //     (s) =>
                  //       s.sportSlug ===
                  //       slugify(sport.name, {
                  //         lower: true,
                  //         trim: true,
                  //         strict: true,
                  //       }),
                  //   )?.order ?? 999)
                  // :
                  //  (summarySports.value.config.find(
                  //     (s) =>
                  //       s.sport ===
                  //       slugify(sport.name, {
                  //         lower: true,
                  //         trim: true,
                  //         strict: true,
                  //       }),
                  //   )?.order ?? 999),
                }}
              >
                <div className="w-[34px] h-[24px] flex items-center justify-center">
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${sport.id}.svg`}
                    onError={(e) => {
                      e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                    }}
                    className={`w-[28px] ${baseTheme === "dark" ? "invert" : ""}`}
                    alt={sport.name}
                  />
                </div>

                <span className="text-[12px] truncate w-full block text-center">
                  {sport.name}
                </span>
              </div>
            );
          })}
        </>
      </HorizontalTabs>

      {/* </div> */}

      {/* Right Arrow */}
      {/* {showRightArrow && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollTabs("right");
          }}
          className={`absolute right-0 top-[14px] flex items-center justify-end w-14 shrink-0 z-[5] h-8`}
          style={{
            background:
              "linear-gradient(to left, var(--background-color), #00000000)",
          }}
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            className={`w-4 h-4 ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
            alt={tAlt("scrollRight")}
          />
        </button>
      )} */}
    </div>
  );
};
