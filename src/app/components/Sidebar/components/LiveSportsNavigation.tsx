import { summarySportsLive } from "@/state/summarySports";
import { orderConfigState } from "@/state/orderConfigState";
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
      {Object.keys(summarySportsLive.value.data)?.map((sport) => {
        if (summarySportsLive.value.counts[sport]?.total === 0) return null;
        const isExpanded = expandedSports.has(sport) && !!eventId;
        if (!isExpanded && isMobile.value) return null;
        return (
          <div
            className="flex w-full"
            key={sport}
            style={{
              order: orderConfigState.value[sport]?.order || 999,
              display:
                orderConfigState.value[sport]?.enabled === false
                  ? "none"
                  : "flex",
            }}
          >
            <LiveSportSection
              key={sport}
              isExpanded={isExpanded}
              toggleSport={toggleSport}
              groupByRegions={groupByRegions}
              selectedSportName={sport}
            />
          </div>
        );
      })}
    </div>
  );
};
