import { PreMatchPanel } from "@/app/components/Specials/preMatchPanel";
import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { LiveMatchesPanel } from "@/app/components/Specials/LiveMatchesPanel";
import { TopLeagueMenu } from "@/app/components/TopLeagueMenu";
import { isMobile } from "@/state/isMobile";
import { loadedPrematchState } from "@/state/loadedPrematch";
import { UpcomingMatches } from "@/app/components/Specials/UpcomingMatches";
import { HorizontalTabs } from "@/app/components/HorizontalTabs";
import TrendingAccas from "@/app/components/HomePage.tsx/TrendingAccas";
import { StarPlayers } from "@/app/components/StarPlayers";

export const HomePage: FunctionComponent = () => {
  const [shouldRenderLive, setShouldRenderLive] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;

    let root: Element | null = null;
    let parent = el.parentElement;
    while (parent) {
      const { overflowY, overflow } = getComputedStyle(parent);
      if (
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflow === "auto"
      ) {
        root = parent;
        break;
      }
      parent = parent.parentElement;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRenderLive(true);
        }
      },
      { root, rootMargin: "200px 0px", threshold: 0 },
    );
    observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex md:p-2 w-full flex-col gap-2">
      {isMobile.value && <TopLeagueMenu />}
      <PreMatchPanel />

      <HorizontalTabs>
        <TrendingAccas />
      </HorizontalTabs>
      {/* {loadedPrematchState.value && <LiveMatchesPanel />} */}
      {/* <PopularMatches /> */}
      <StarPlayers />
      {/* <UpcomingMatches /> */}
    </div>
  );
};
