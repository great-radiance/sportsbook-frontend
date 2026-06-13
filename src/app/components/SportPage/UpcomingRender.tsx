import { FunctionComponent } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Match } from "../MatchesBoard/components/Match";
import { UpcomingMatchSkeleton } from "../Loading";
import { sportsbookStore, useSportsbookStore } from "@/state/sportsbookStoreContext";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";
import type { UpcomingLeagueEntry } from "@/helpers/upcomingSportCatalog";

const WINDOW_OPTIONS = [3, 12, 24] as const;
type WindowHours = (typeof WINDOW_OPTIONS)[number];
type SortBy = "competition" | "start-time";

type Props = {
  leagues: UpcomingLeagueEntry[];
  loading?: boolean;
};

const eventStartMs = (eventId: number): number => {
  const startTime = sportsbookStore.storeState.value[eventId]?.value?.startTime;
  if (!startTime) return 0;
  const ms = new Date(startTime).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const filterByWindow = (eventIds: number[], windowHours: number): number[] => {
  const now = Date.now();
  const windowEnd = now + windowHours * 60 * 60 * 1000;
  return eventIds.filter((id) => {
    const ms = eventStartMs(id);
    return ms >= now && ms <= windowEnd;
  });
};

const dayGroupLabel = (ms: number): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(ms);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  const dd = String(day.getDate()).padStart(2, "0");
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
};

type FilterMenuProps = {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: preact.ComponentChildren;
};

const FilterMenu: FunctionComponent<FilterMenuProps> = ({
  label,
  open,
  onToggle,
  children,
}) => {
  const { baseColorTheme } = useSportsbookStore();
  const baseTheme = baseColorTheme.value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--sub-element-secondary)] text-[13px] text-[var(--text-basic-color)]"
      >
        <span>{label}</span>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className={`w-4 h-4 transition-transform ${open ? "-rotate-90" : "rotate-90"} ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
          alt=""
        />
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-[300] mt-1 min-w-[200px] rounded-lg border border-[var(--border-color)] bg-[var(--sub-element-secondary)] p-3 shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
};

const UpcomingRender = ({ leagues, loading = false }: Props) => {
  const { storeState, baseColorTheme } = useSportsbookStore();
  const [windowHours, setWindowHours] = useState<WindowHours>(24);
  const [sortBy, setSortBy] = useState<SortBy>("competition");
  const [openHoursMenu, setOpenHoursMenu] = useState(false);
  const [openSortMenu, setOpenSortMenu] = useState(false);
  const [openedLeagueKeys, setOpenedLeagueKeys] = useState<Set<string>>(
    new Set(),
  );
  const baseTheme = baseColorTheme.value;
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredLeagues = useMemo(() => {
    return leagues
      .map((league) => ({
        ...league,
        key: `${league.regionId}:${league.leagueId}`,
        eventIds: filterByWindow(league.eventIds, windowHours).sort(
          (a, b) => eventStartMs(a) - eventStartMs(b),
        ),
      }))
      .filter((league) => league.eventIds.length > 0);
  }, [leagues, windowHours, storeState.value]);

  const autoOpenedRef = useRef<string>("");
  useEffect(() => {
    const signature = filteredLeagues.map((l) => l.key).join("|");
    if (autoOpenedRef.current === signature) return;
    autoOpenedRef.current = signature;
    setOpenedLeagueKeys(new Set());
  }, [filteredLeagues]);

  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpenHoursMenu(false);
        setOpenSortMenu(false);
      }
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  const startTimeGroups = useMemo(() => {
    const ids = filteredLeagues.flatMap((l) => l.eventIds);
    const unique = [...new Set(ids)].sort(
      (a, b) => eventStartMs(a) - eventStartMs(b),
    );
    const groups = new Map<string, number[]>();
    for (const id of unique) {
      const label = dayGroupLabel(eventStartMs(id));
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(id);
    }
    return [...groups.entries()];
  }, [filteredLeagues, storeState.value]);

  const toggleLeague = (key: string) => {
    setOpenedLeagueKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const competitionLabel = (league: UpcomingLeagueEntry) =>
    league.regionName
      ? `${league.regionName} - ${league.leagueName}`
      : league.leagueName;

  const isEmpty = !loading && filteredLeagues.length === 0;

  return (
    <div className="flex flex-col w-full gap-3" ref={menuRef}>
      <div className="flex flex-wrap items-center gap-3">
        <FilterMenu
          label={`${windowHours} hours`}
          open={openHoursMenu}
          onToggle={() => {
            setOpenHoursMenu((v) => !v);
            setOpenSortMenu(false);
          }}
        >
          <p className="text-[11px] text-[var(--text-sub-color)] mb-2">
            Show matches in:
          </p>
          <div className="flex flex-col gap-1">
            {WINDOW_OPTIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                className={`w-full text-left px-2 py-1.5 rounded text-[13px] ${
                  windowHours === hours
                    ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                    : "text-[var(--text-basic-color)] hover:bg-white/5"
                }`}
                onClick={() => {
                  setWindowHours(hours);
                  setOpenHoursMenu(false);
                }}
              >
                {hours} hours
              </button>
            ))}
          </div>
        </FilterMenu>

        <FilterMenu
          label={sortBy === "competition" ? "Competition" : "Start time"}
          open={openSortMenu}
          onToggle={() => {
            setOpenSortMenu((v) => !v);
            setOpenHoursMenu(false);
          }}
        >
          <p className="text-[11px] text-[var(--text-sub-color)] mb-2">
            Matches sorted by:
          </p>
          <div className="flex flex-col gap-1">
            {(
              [
                ["competition", "Competition"],
                ["start-time", "Start time"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`w-full text-left px-2 py-1.5 rounded text-[13px] ${
                  sortBy === value
                    ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                    : "text-[var(--text-basic-color)] hover:bg-white/5"
                }`}
                onClick={() => {
                  setSortBy(value);
                  setOpenSortMenu(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterMenu>
      </div>

      {loading ? (
        <div className="flex flex-col gap-[2px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <UpcomingMatchSkeleton key={i} />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-sub-color)]">
          No matches in this time window
        </p>
      ) : sortBy === "start-time" ? (
        <div className="flex flex-col w-full ">
          {startTimeGroups.map(([label, eventIds]) => (
            <div key={label} className="flex flex-col w-full ">
              <div className="w-[72px] shrink-0 px-3 py-3 text-[12px] text-[var(--text-sub-color)]">
                {label}
              </div>
              <div className="flex flex-col flex-1 min-w-0 rounded-[8px] border border-[var(--border-color)] bg-[var(--background-element)] overflow-hidden">
                {eventIds.map((eventId, index) => (
                  <Match
                    key={eventId}
                    eventId={eventId}
                    marketType={1}
                    allowAutoSelect
                    allowRounded={
                      index === 0 || index === eventIds.length - 1
                        ? true
                        : false
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filteredLeagues.map((league) => {
            const isOpen = openedLeagueKeys.has(league.key);
            return (
              <div key={league.key} className="flex flex-col w-full">
                <button
                  type="button"
                  className="flex items-center justify-between gap-2 w-full px-1 py-2 text-left"
                  onClick={() => toggleLeague(league.key)}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <img
                      src={getFlagIconFromregionName(league.regionName)}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                      }}
                    />
                    <span className="text-[13px] font-medium text-[var(--text-basic-color)] truncate">
                      {competitionLabel(league)}
                    </span>
                  </span>
                  <img
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isOpen ? "-rotate-90" : "rotate-90"
                    } ${baseTheme === "dark" ? "brightness-0 invert" : "brightness-0"}`}
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                    alt=""
                  />
                </button>
                {isOpen ? (
                  <div className="flex flex-col gap-2 pl-1 pb-2">
                    {league.eventIds.map((eventId) => (
                      <Match
                        key={eventId}
                        eventId={eventId}
                        marketType={1}
                        allowAutoSelect
                        allowRounded
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingRender;
