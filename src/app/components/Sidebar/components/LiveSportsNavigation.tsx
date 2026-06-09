import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { isMobile } from "@/state/isMobile";
import { LiveSportSection } from "@/app/components/Sidebar/components/LiveSportSection";
import { useRouteParams } from "@/hooks/useRotueParams";

interface LiveSportsNavigationProps {
  selectedSport?: string;
  groupByRegions?: boolean;
}

export const LiveSportsNavigation: FunctionComponent<
  LiveSportsNavigationProps
> = ({ selectedSport, groupByRegions = false }) => {
  const { pageName, sportName, eventId } = useRouteParams();
  const [expandedSports, setExpandedSports] = useState<Set<string>>(
    new Set(["Soccer"]),
  ); // Football expanded by default

  useEffect(() => {
    if (pageName !== "live" || isMobile.value) return;
    setExpandedSports((prev) => {
      const newSet = new Set(prev);
      newSet.add(sportName || "");
      return newSet;
    });
  }, [pageName, sportName]);

  const toggleSport = (sportName: string | null) => {
    if (sportName === null) return;
    setExpandedSports((prev) => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(sportName);

      if (wasExpanded) {
        // Collapsing
        newSet.delete(sportName);
      } else {
        // Expanding - fetch data
        newSet.add(sportName);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col w-full gap-[2px] rounded-[4px]">
      {(summarySportsLive.value.data ?? []).map((sportTuple) => {
        const sportId = sportTuple[0];
        const sportName = sportTuple[1];
        if ((summarySportsLive.value.counts[sportId]?.total ?? 0) === 0)
          return null;
        const isExpanded = expandedSports.has(sportName) && !!eventId;
        if (!isExpanded && isMobile.value) return null;
        return (
          <div className="flex w-full" key={sportId}>
            <LiveSportSection
              key={sportId}
              isExpanded={isExpanded}
              toggleSport={toggleSport}
              groupByRegions={groupByRegions}
              selectedSportName={sportName}
            />
          </div>
        );
      })}
    </div>
  );
};
