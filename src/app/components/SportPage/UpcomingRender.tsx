import { Match } from "../MatchesBoard/components/Match";
import { MoneylineMatch } from "../MatchesBoard/components/Match/MoneylineMatch";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { storeState } from "@/state/storeState";
import { baseColorTheme } from "@/state/baseColorTheme";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { LeagueLabel } from "@/helpers/resolveSummaryLabels";
import { summarySports } from "@/state/summarySports";
import { useSidebarMarketNavigation } from "@/hooks/useSidebarMarketNavigation";
import {
  eventHasMarketType,
  isMoneylineSport,
} from "@/helpers/sidebarMarketNavigation";

const eventStartMs = (eventId: number): number => {
  const startTime = storeState.value[eventId]?.value?.startTime;
  if (!startTime) return 0;
  const ms = new Date(startTime).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

interface League {
  key: string;
  regionId: number;
  leagueId: number;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

type Props = {
  leagueEntries: League[];
  leagueLabelMap: Map<string, LeagueLabel>;
  selectedLeagueKey: string;
  setSelectedLeagueKey: (key: string) => void;

  sportId: number;
  sportName?: string;

  selectedCategory: "Matches" | string;

  selectedLeagueEntry?: {
    eventIds?: number[];
    outrightIds?: number[];
  };

  loading: boolean;

  /** Time window (in hours) used by the upstream `apiGetUpcomingMatches` call. */
  windowHours: number;
  onWindowHoursChange: (hours: number) => void;

  BASE_ASSET_PUBLIC_URL: string;
  getFlagIconFromregionName: (region: string) => string;
};

const UpcomingRender = ({
  leagueEntries,
  leagueLabelMap,
  selectedLeagueKey,
  setSelectedLeagueKey,
  sportId,
  sportName,
  selectedCategory,
  selectedLeagueEntry,
  loading,
  windowHours,
  onWindowHoursChange,
  BASE_ASSET_PUBLIC_URL,
  getFlagIconFromregionName,
}: Props) => {
  const [sortBy, setSortBy] = useState<"competition" | "start-time">(
    "competition",
  );
  const [openedLeagueKeys, setOpenedLeagueKeys] = useState<Set<string>>(
    new Set(),
  );
  const baseTheme = baseColorTheme.value;

  const visibleLeagueGroups = useMemo(() => {
    return leagueEntries
      .map((league) => ({
        ...league,
        visibleEventIds:
          selectedCategory === "Matches"
            ? league.eventIds
            : league.outrightIds,
      }))
      .filter((league) => league.visibleEventIds.length > 0);
  }, [leagueEntries, selectedCategory]);

  const loadedEventsForMarkets = useMemo(() => {
    const ids = visibleLeagueGroups.flatMap((l) => l.visibleEventIds);
    return ids.map((id) => storeState.value[id]?.value).filter(Boolean);
  }, [visibleLeagueGroups, storeState.value]);

  const {
    marketOptions,
    showMarketNav,
    selectedMarketType,
    setSelectedMarketType,
    matchMarketType,
    allowAutoSelect,
  } = useSidebarMarketNavigation({
    sportId,
    sportName,
    loadedEvents: loadedEventsForMarkets,
  });

  const renderMatch = (eventId: number) => {
    const stored = storeState.value[eventId]?.value;
    if (
      showMarketNav &&
      stored &&
      !isMoneylineSport(stored.sport?.id ?? sportId, stored.sport?.name) &&
      !eventHasMarketType(stored, selectedMarketType)
    ) {
      return null;
    }
    if (
      stored &&
      isMoneylineSport(stored.sport?.id ?? sportId, stored.sport?.name)
    ) {
      return <MoneylineMatch key={eventId} eventId={eventId} />;
    }
    return (
      <Match
        key={eventId}
        eventId={eventId}
        marketType={matchMarketType}
        allowAutoSelect={allowAutoSelect}
        allowRounded
      />
    );
  };

  /** Reset auto-expansion when the league list changes (sport / category switch). */
  const autoOpenedRef = useRef<League[] | null>(null);
  useEffect(() => {
    if (autoOpenedRef.current === leagueEntries) return;
    autoOpenedRef.current = leagueEntries;
    setOpenedLeagueKeys(new Set());
  }, [leagueEntries]);

  useEffect(() => {
    if (openedLeagueKeys.size > 0 || visibleLeagueGroups.length === 0) return;
    setOpenedLeagueKeys(
      new Set(visibleLeagueGroups.slice(0, 5).map((league) => league.key)),
    );
  }, [visibleLeagueGroups, openedLeagueKeys.size]);
  return (
    <>
      <div className="flex flex-col w-full p-2 gap-2 rounded-b-[16px]">
        {/* League tab list */}
        <div className="flex gap-4">
          <select
            value={windowHours}
            onChange={(e) =>
              onWindowHoursChange(Number(e.currentTarget?.value))
            }
            className="p-1 border border-[var(--border-color)] text-sm text-[var(--text-sub-color)] border-1 bg-[var(--sub-element-secondary)] rounded"
          >
            <option key={3} value={3}>
              3 hours
            </option>
            <option key={6} value={6}>
              6 hours
            </option>
            <option key={12} value={12}>
              12 hours
            </option>
            <option key={24} value={24}>
              24 hours
            </option>
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.currentTarget?.value as "competition" | "start-time")
            }
            className="p-1 border border-[var(--border-color)] text-sm text-[var(--text-sub-color)] border-1 bg-[var(--sub-element-secondary)] rounded"
          >
            <option key={"competition"} value={"competition"}>
              Competition
            </option>
            <option key={"start-time"} value={"start-time"}>
              Start time
            </option>
          </select>
        </div>

        {showMarketNav ? (
          <MarketNavigation
            options={marketOptions}
            selectedValue={selectedMarketType}
            onSelect={setSelectedMarketType}
          />
        ) : null}
      </div>

      <section className="flex flex-col gap-3 mt-5">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : sortBy === "competition" ? (
          visibleLeagueGroups.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-[var(--text-sub-color)]">
              No matches in this time window
            </p>
          ) : (
          visibleLeagueGroups.map((league) => {
            const isOpen = openedLeagueKeys.has(league.key);
            const label =
              leagueLabelMap.get(`${league.regionId}:${league.leagueId}`) ??
              null;
            const leagueName = label?.leagueName ?? String(league.leagueId);
            const regionName = label?.regionName ?? "";
            return (
              <div key={league.key} className="flex flex-col gap-2">
                <div
                  className="flex items-center justify-between gap-1 cursor-pointer"
                  onClick={() => {
                    setOpenedLeagueKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(league.key)) {
                        next.delete(league.key);
                      } else {
                        next.add(league.key);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center gap-1">
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/logo/leagues/${encodeURIComponent(
                        sportName || "",
                      )}/${encodeURIComponent(regionName)}/${encodeURIComponent(
                        leagueName,
                      )}.webp`}
                      className={`w-5 h-5 object-contain`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(
                          regionName,
                        )}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={leagueName}
                    />
                    <p className="text-sm font-semibold text-[var(--text-basic-color)]">
                      {leagueName}
                    </p>
                  </div>
                  <span className="text-[12px] text-[var(--text-sub-color)]">
                    <img
                      className={`w-[24px] rounded-[4px] h-[24px] transition-all shrink-0 ${
                        isOpen ? "-rotate-90" : "rotate-90"
                      } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                      alt=""
                    />
                  </span>
                </div>
                {isOpen && league.visibleEventIds.map(renderMatch)}
              </div>
            );
          })
          )
        ) : (
          leagueEntries
            .flatMap((league) =>
              selectedCategory === "Matches"
                ? league.eventIds
                : league.outrightIds,
            )
            .sort((a, b) => eventStartMs(a) - eventStartMs(b))
            .map(renderMatch)
        )}
      </section>
    </>
  );
};

export default UpcomingRender;
