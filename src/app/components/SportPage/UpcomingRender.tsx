import { Match } from "../MatchesBoard/components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { MarketNavigation } from "../marketNavigation";
import { storeState } from "@/state/storeState";
import { baseColorTheme } from "@/state/baseColorTheme";
import { useEffect, useMemo, useState } from "preact/hooks";

const eventStartMs = (eventId: number): number => {
  const startTime = storeState.value[eventId]?.value?.startTime;
  if (!startTime) return 0;
  const ms = new Date(startTime).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

interface League {
  key: string;
  region: string;
  league: string;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
}

type Props = {
  leagueEntries: League[];
  selectedLeagueKey: string;
  setSelectedLeagueKey: (key: string) => void;

  orderConfigState: any;
  sportName?: string;

  selectedCategory: "Matches" | string;

  selectedMarkets: Record<string, any[]>;
  selectedOutrightMarkets: Record<string, any[]>;

  selectedMarketSlug: string;
  setSelectedMarketSlug: (slug: string) => void;

  selectedLeagueEntry?: {
    eventIds?: number[];
    outrightIds?: number[];
  };

  loading: boolean;

  BASE_ASSET_PUBLIC_URL: string;
  getFlagIconFromregionName: (region: string) => string;
  getTranslatedText: (text: string) => string;
};

const UpcomingRender = ({
  leagueEntries,
  selectedLeagueKey,
  setSelectedLeagueKey,
  orderConfigState,
  sportName,
  selectedCategory,
  selectedMarkets,
  selectedOutrightMarkets,
  selectedMarketSlug,
  setSelectedMarketSlug,
  selectedLeagueEntry,
  loading,
  BASE_ASSET_PUBLIC_URL,
  getFlagIconFromregionName,
  getTranslatedText,
}: Props) => {
  const [filterStartTime, setFilterStartTime] = useState<number>(24); // default to 3 hours
  const [sortBy, setSortBy] = useState<"competition" | "start-time">(
    "competition",
  );
  const [openedLeagueKeys, setOpenedLeagueKeys] = useState<Set<string>>(
    new Set(),
  );
  const baseTheme = baseColorTheme.value;

  const visibleLeagueGroups = useMemo(() => {
    const now = Date.now();
    const windowEnd = now + filterStartTime * 60 * 60 * 1000;
    return leagueEntries
      .map((league) => {
        const ids =
          selectedCategory === "Matches" ? league.eventIds : league.outrightIds;
        const visibleEventIds = ids.filter((eventId) => {
          const startMs = eventStartMs(eventId);
          if (!startMs) return false;
          return startMs >= now && startMs <= windowEnd;
        });
        return {
          ...league,
          visibleEventIds,
        };
      })
      .filter((league) => league.visibleEventIds.length > 0)
      .sort((a, b) => {
        const aOrder =
          orderConfigState.value[sportName || ""]?.regions?.[a.region]
            ?.leagues?.[a.league]?.order ?? 999;
        const bOrder =
          orderConfigState.value[sportName || ""]?.regions?.[b.region]
            ?.leagues?.[b.league]?.order ?? 999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.league.localeCompare(b.league);
      });
  }, [
    leagueEntries,
    selectedCategory,
    filterStartTime,
    orderConfigState,
    sportName,
  ]);

  useEffect(() => {
    if (openedLeagueKeys.size === 0 && visibleLeagueGroups.length > 0) {
      setOpenedLeagueKeys(
        new Set(visibleLeagueGroups.slice(0, 5).map((league) => league.key)),
      );
    }
  }, [visibleLeagueGroups, openedLeagueKeys.size]);
  return (
    <>
      <div className="flex flex-col w-full p-2 gap-2 rounded-b-[16px]">
        {/* League tab list */}
        <div className="flex gap-4">
          <select
            value={filterStartTime}
            onChange={(e) => setFilterStartTime(Number(e.currentTarget?.value))}
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

        <MarketNavigation
          options={
            selectedCategory === "Matches"
              ? (selectedMarkets[selectedLeagueKey] ?? [])
              : (selectedOutrightMarkets[selectedLeagueKey] ?? [])
          }
          selectedValue={selectedMarketSlug}
          onSelect={setSelectedMarketSlug}
        />
      </div>

      <section className="flex flex-col gap-3 mt-5">
        {loading ? (
          <div className="flex flex-col w-full gap-[2px] mt-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <UpcomingMatchSkeleton key={`match-${index}`} />
            ))}
          </div>
        ) : sortBy === "competition" ? (
          visibleLeagueGroups.map((league) => {
            const isOpen = openedLeagueKeys.has(league.key);
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
                      )}/${encodeURIComponent(
                        league.region || "",
                      )}/${encodeURIComponent(league.league || "")}.webp`}
                      className={`w-5 h-5 object-contain`}
                      onError={(e) => {
                        e.currentTarget.src = `${getFlagIconFromregionName(
                          league.region || "",
                        )}`;
                        e.currentTarget.className = "rounded-full w-4 h-4";
                      }}
                      alt={league.league}
                    />
                    <p className="text-sm font-semibold text-[var(--text-basic-color)]">
                      {getTranslatedText(league.league)}
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
                {isOpen &&
                  league.visibleEventIds.map((eventId) => (
                    <Match
                      key={eventId}
                      eventId={eventId}
                      marketSlug={selectedMarketSlug}
                      allowRounded
                    />
                  ))}
              </div>
            );
          })
        ) : (
          leagueEntries
            .flatMap((league) =>
              (selectedCategory === "Matches"
                ? league.eventIds
                : league.outrightIds
              ).filter((eventId) => {
                const startMs = eventStartMs(eventId);
                if (!startMs) return false;
                const now = Date.now();
                return (
                  startMs >= now &&
                  startMs <= now + filterStartTime * 60 * 60 * 1000
                );
              }),
            )
            .sort((a, b) => eventStartMs(a) - eventStartMs(b))
            .map((eventId) => (
              <Match
                key={eventId}
                eventId={eventId}
                marketSlug={selectedMarketSlug}
                allowRounded
              />
            ))
        )}
      </section>
    </>
  );
};

export default UpcomingRender;
