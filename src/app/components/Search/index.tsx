/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "preact/hooks";
import { useLocation } from "wouter-preact";
import debounce from "lodash.debounce";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { baseUrl, BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "./style.css";
import { apiSearchEvents } from "@/api/events/apiSearchEvents";
import type { SearchEventRow } from "@/types/searchEvent";
import { searchRowPrematchPath } from "@/helpers/mapGuideSearchEvent";
import { PopularMatches } from "../Specials/PopularMatches";

const PAGE_SIZE = 5;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getQueryTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export const Search: FunctionComponent = () => {
  const {
    showSearchState,
    isOpenedMyBet,
    isOpenedSidebar,
    baseColorTheme,
    isMobile,
  } = useSportsbookStore();
  const baseTheme = baseColorTheme.value;
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allResults, setAllResults] = useState<SearchEventRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [selectedSport, setSelectedSport] = useState<string>("All");
  const [eventsExpanded, setEventsExpanded] = useState<boolean>(true);
  const [marketsExpanded, setMarketsExpanded] = useState<boolean>(true);
  const [visibleEventsCount, setVisibleEventsCount] =
    useState<number>(PAGE_SIZE);
  const [visibleMarketsCount, setVisibleMarketsCount] =
    useState<number>(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<any>(null);
  const searchRequestIdRef = useRef(0);

  const debouncedSearchRef = useRef(
    debounce(async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setAllResults([]);
        setTotalCount(0);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const requestId = ++searchRequestIdRef.current;
      setLoading(true);
      try {
        const results = await apiSearchEvents({ q });
        if (requestId !== searchRequestIdRef.current) return;
        const rows = results.data ?? [];
        setAllResults(rows);
        setTotalCount(results.total ?? rows.length);
        setHasMore(rows.length > PAGE_SIZE);
        setSelectedSport("All");
        setEventsExpanded(true);
        setMarketsExpanded(true);
        setVisibleEventsCount(PAGE_SIZE);
        setVisibleMarketsCount(PAGE_SIZE);
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) return;
        console.error("Error searching events:", error);
        setAllResults([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300),
  );

  useEffect(() => {
    if (showSearchState.value) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setAllResults([]);
      setTotalCount(0);
      setHasMore(false);
      setLoading(false);
      setSelectedSport("All");
      setEventsExpanded(true);
      setMarketsExpanded(true);
      setVisibleEventsCount(PAGE_SIZE);
      setVisibleMarketsCount(PAGE_SIZE);
      searchRequestIdRef.current += 1;
      debouncedSearchRef.current.cancel();
    }
  }, [showSearchState.value]);

  useEffect(() => {
    debouncedSearchRef.current(searchQuery);
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, [searchQuery]);

  const isQueryActive = searchQuery.trim().length >= 2;
  const queryTokens = useMemo(() => getQueryTokens(searchQuery), [searchQuery]);

  const highlightText = useCallback(
    (text: string) => {
      if (!text) return text;
      if (!queryTokens.length) return text;
      const pattern = new RegExp(
        `(${queryTokens.map(escapeRegExp).join("|")})`,
        "ig",
      );
      const parts = text.split(pattern);
      return (
        <>
          {parts.map((part, idx) => {
            const isHit = queryTokens.some(
              (t) => part.toLowerCase() === t.toLowerCase(),
            );
            return isHit ? (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={`${part}-${idx}`}
                className="bg-[var(--text-yellow)] text-black rounded-[3px] px-1"
              >
                {part}
              </span>
            ) : (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`${part}-${idx}`}>{part}</span>
            );
          })}
        </>
      );
    },
    [queryTokens],
  );

  const listMatches = useMemo(() => {
    if (!allResults.length) return [];
    if (selectedSport === "All") return allResults;
    return allResults.filter((m) => m.sportName === selectedSport);
  }, [allResults, selectedSport]);

  const sportFilterList = useMemo(() => {
    if (!allResults.length) return [];
    const sports = new Set<string>();
    allResults.forEach((r) => {
      if (r.sportName) sports.add(r.sportName);
    });
    return ["All", ...[...sports].sort()];
  }, [allResults]);

  const matchedMarkets = useMemo(() => {
    if (!queryTokens.length) return [];
    const qLower = queryTokens.map((t) => t.toLowerCase());
    const out: {
      eventId: number;
      sport: string;
      sportId: number;
      region: string;
      regionId: number;
      league: string;
      leagueId: number;
      startDate: number;
      participants: string[];
      marketName: string;
    }[] = [];

    for (const row of listMatches) {
      const eventId = row.eventId;
      const sport = row.sportName;
      const region = row.regionName;
      const league = row.leagueName;
      const participants = row.participants.filter(Boolean);
      const startDate = row.startTime;
      for (const m of row.markets) {
        const name = m.name;
        if (!name) continue;
        const nameLower = name.toLowerCase();
        const hit = qLower.some((t) => nameLower.includes(t));
        if (!hit) continue;
        out.push({
          eventId,
          sport,
          sportId: row.sportId,
          region,
          regionId: row.regionId,
          league,
          leagueId: row.leagueId,
          startDate,
          participants,
          marketName: name,
        });
      }
    }
    return out;
  }, [listMatches, queryTokens]);

  const fetchNextPage = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setVisibleEventsCount((c) => c + PAGE_SIZE);
    setVisibleMarketsCount((c) => c + PAGE_SIZE);
    setHasMore(
      visibleEventsCount + PAGE_SIZE < listMatches.length ||
        visibleMarketsCount + PAGE_SIZE < matchedMarkets.length,
    );
    setLoadingMore(false);
  }, [
    hasMore,
    loadingMore,
    visibleEventsCount,
    visibleMarketsCount,
    listMatches.length,
    matchedMarkets.length,
  ]);

  // If the user asks to view more than we currently have loaded, auto-fetch next page.
  useEffect(() => {
    if (!isQueryActive) return;
    if (!eventsExpanded) return;
    if (!hasMore || loadingMore) return;
    if (visibleEventsCount <= listMatches.length) return;
    void fetchNextPage();
  }, [
    isQueryActive,
    eventsExpanded,
    hasMore,
    loadingMore,
    visibleEventsCount,
    listMatches.length,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (!isQueryActive) return;
    if (!marketsExpanded) return;
    if (!hasMore || loadingMore) return;
    if (visibleMarketsCount <= matchedMarkets.length) return;
    void fetchNextPage();
  }, [
    isQueryActive,
    marketsExpanded,
    hasMore,
    loadingMore,
    visibleMarketsCount,
    matchedMarkets.length,
    fetchNextPage,
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showSearchState.value) {
      dialog.show();
    } else {
      dialog.hide();
    }

    const handleRequestClose = () => {
      showSearchState.value = false;
    };

    const handleAfterHide = () => {
      showSearchState.value = false;
    };

    dialog.addEventListener("sl-request-close", handleRequestClose);
    dialog.addEventListener("sl-after-hide", handleAfterHide);

    return () => {
      dialog.removeEventListener("sl-request-close", handleRequestClose);
      dialog.removeEventListener("sl-after-hide", handleAfterHide);
    };
  }, [showSearchState.value]);

  return (
    <>
      <sl-dialog
        ref={dialogRef}
        open={showSearchState.value}
        onSlRequestClose={() => (showSearchState.value = false)}
        onSlAfterHide={() => (showSearchState.value = false)}
        onSlClose={() => (showSearchState.value = false)}
        className="searchDialog mx-auto my-auto rounded-[24px] pb-4 flex flex-col"
      >
        <div className="flex flex-col gap-2 flex-1 text-[var(--text-basic-color)]">
          <div className="sticky top-0 flex searchBar items-center w-full gap-2 z-[100] bg-[var(--sub-element-color)]">
            <div className="flex items-center w-full border border-[var(--border-color)] rounded-full py-2  px-4">
              <img
                src={`${baseUrl}/assets/icons/search-small.svg`}
                className="w-4 h-4 mr-2 opacity-50 brightness-0 invert"
                alt="Search"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onInput={(e) =>
                  setSearchQuery((e.target as HTMLInputElement).value)
                }
                className="flex-1 w-full border-none text-[var(--text-basic-color)] bg-[var(--sub-element-color)] outline-none text-[14px]"
                placeholder="Search matches, leagues, sports, region..."
              />
            </div>
          </div>

          {isQueryActive && sportFilterList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {sportFilterList.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                  className={`px-3 py-1.5 rounded-full text-[14px] font-medium transition-all ${
                    selectedSport === sport
                      ? "bg-[var(--highlight-background)] text-[var(--text-basic-color)]"
                      : "bg-[var(--sub-element-color)] text-[var(--text-basic-color)] hover:bg-[var(--highlight-background)]"
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-none">
            {!isQueryActive ? null : loading ? ( // <PopularMatches />
              <div className="flex justify-center py-8 text-[14px] text-[var(--text-sub-color)]">
                Searching…
              </div>
            ) : listMatches.length === 0 ? (
              <div className="flex justify-center py-8 text-center text-gray-500">
                <p>No events found for &quot;{searchQuery}&quot;.</p>
                <p>Try a different search term.</p>
              </div>
            ) : (
              <div className="flex w-full flex-col">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setEventsExpanded((v) => !v)}
                    className="flex items-center justify-between bg-[var(--sub-element-secondary)] px-3 py-2 rounded-[8px] w-full"
                  >
                    <h3 className="text-[14px] font-semibold">Events</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--text-sub-color)]">
                        Results: {totalCount}
                      </span>
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                        className={`w-[20px] ${baseColorTheme.value === "dark" ? "brightness-0 invert" : "brightness-0"} object-contain transition-transform ${
                          eventsExpanded ? "-rotate-90" : "rotate-90"
                        }`}
                        alt=""
                      />
                    </div>
                  </button>

                  {eventsExpanded &&
                    listMatches.slice(0, visibleEventsCount).map((m) => {
                      const p1 = m.participants[0] ?? "";
                      const p2 = m.participants[1] ?? "";
                      const title = p1 && p2 ? `${p1} - ${p2}` : "";
                      return (
                        <button
                          key={`${m.eventId}-${m.sportName}-${m.leagueName}`}
                          type="button"
                          onClick={(e) => {
                            linkButtonOnClick(
                              e,
                              searchRowPrematchPath(m),
                              setLocation,
                            );
                            showSearchState.value = false;
                            dialogRef.current?.hide();
                            isOpenedMyBet.value = isMobile.value ? false : true;
                            isOpenedSidebar.value = false;
                          }}
                          className="flex items-start gap-2 w-full text-left rounded-lg p-3 hover:bg-[var(--highlight-background)] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] transition-colors"
                        >
                          <img
                            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${m.sportId}.svg`}
                            onError={(e) => {
                              e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                            }}
                            alt=""
                            className={`w-5 h-5 object-contain flex-shrink-0 mt-0.5 ${baseTheme === "dark" ? "invert" : ""}`}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12px] text-[var(--text-sub-color)] truncate">
                              {highlightText(m.leagueName || "")}
                            </span>
                            <span className="text-[14px] font-medium text-[var(--text-basic-color)] truncate mt-0.5">
                              {highlightText(title || "")}
                            </span>
                            <span className="text-[12px] text-[var(--text-sub-color)] mt-0.5">
                              {formatDate(m.startTime)},{" "}
                              {formatTime(m.startTime)}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                  {eventsExpanded &&
                    listMatches.length > visibleEventsCount && (
                      <div className="flex justify-center py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleEventsCount((c) => c + PAGE_SIZE)
                          }
                          className="text-[14px] font-medium text-[var(--text-basic-color)] hover:text-[var(--text-primary-color)]"
                        >
                          View more…
                        </button>
                      </div>
                    )}
                  {eventsExpanded &&
                    listMatches.length <= visibleEventsCount &&
                    hasMore && (
                      <div className="flex justify-center py-2">
                        <button
                          type="button"
                          disabled={loadingMore}
                          onClick={() =>
                            setVisibleEventsCount((c) => c + PAGE_SIZE)
                          }
                          className="text-[14px] font-medium text-[var(--text-basic-color)] hover:text-[var(--text-primary-color)] disabled:opacity-50"
                        >
                          {loadingMore ? "Loading…" : "View more…"}
                        </button>
                      </div>
                    )}
                </div>

                {matchedMarkets.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => setMarketsExpanded((v) => !v)}
                      className="flex items-center justify-between bg-[var(--sub-element-secondary)] px-3 py-2 rounded-[8px] w-full"
                    >
                      <h3 className="text-[14px] font-semibold">Markets</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--text-sub-color)]">
                          Results: {matchedMarkets.length}
                        </span>
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                          className={`w-[20px] ${baseColorTheme.value === "dark" ? "brightness-0 invert" : "brightness-0"} object-contain transition-transform ${
                            marketsExpanded ? "-rotate-90" : "rotate-90"
                          }`}
                          alt=""
                        />
                      </div>
                    </button>

                    {marketsExpanded &&
                      matchedMarkets
                        .slice(0, visibleMarketsCount)
                        .map((mm, idx) => {
                          const title =
                            mm.participants.length >= 2
                              ? `${mm.participants[0]} - ${mm.participants[1]}`
                              : mm.league;
                          return (
                            <button
                              key={`${mm.eventId}-${mm.marketName}-${idx}`}
                              type="button"
                              onClick={(e) => {
                                linkButtonOnClick(
                                  e,
                                  searchRowPrematchPath({
                                    eventId: mm.eventId,
                                    sportName: mm.sport,
                                    sportId: mm.sportId,
                                    regionName: mm.region,
                                    regionId: mm.regionId,
                                    leagueName: mm.league,
                                    leagueId: mm.leagueId,
                                    participants: [
                                      mm.participants[0] ?? "",
                                      mm.participants[1] ?? "",
                                    ],
                                    startTime: mm.startDate,
                                    markets: [],
                                  }),
                                  setLocation,
                                );
                                showSearchState.value = false;
                                dialogRef.current?.hide();
                                isOpenedMyBet.value = isMobile.value
                                  ? false
                                  : true;
                                isOpenedSidebar.value = false;
                              }}
                              className="flex items-start gap-2 w-full text-left rounded-lg p-3 hover:bg-[var(--highlight-background)] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] transition-colors"
                            >
                              <img
                                src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${mm.sportId}.svg`}
                                onError={(e) => {
                                  e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                                }}
                                alt=""
                                className={`w-5 h-5 object-contain flex-shrink-0 mt-0.5 ${baseTheme === "dark" ? "invert" : ""}`}
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[12px] text-[var(--text-sub-color)] truncate">
                                  {highlightText(mm.marketName)} |{" "}
                                  {highlightText(title)}
                                </span>
                                <span className="text-[12px] text-[var(--text-sub-color)] mt-0.5">
                                  {formatDate(mm.startDate)},{" "}
                                  {formatTime(mm.startDate)}
                                </span>
                              </div>
                            </button>
                          );
                        })}

                    {marketsExpanded &&
                      matchedMarkets.length > visibleMarketsCount && (
                        <div className="flex justify-center py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleMarketsCount((c) => c + PAGE_SIZE)
                            }
                            className="text-[14px] font-medium text-[var(--text-basic-color)] hover:text-[var(--text-primary-color)]"
                          >
                            View more…
                          </button>
                        </div>
                      )}
                    {marketsExpanded &&
                      matchedMarkets.length <= visibleMarketsCount &&
                      hasMore && (
                        <div className="flex justify-center py-2">
                          <button
                            type="button"
                            disabled={loadingMore}
                            onClick={() =>
                              setVisibleMarketsCount((c) => c + PAGE_SIZE)
                            }
                            className="text-[14px] font-medium text-[var(--text-basic-color)] hover:text-[var(--text-primary-color)] disabled:opacity-50"
                          >
                            {loadingMore ? "Loading…" : "View more…"}
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </sl-dialog>
    </>
  );
};
