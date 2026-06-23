/** @jsxImportSource preact */
import type { BetBuilderHighlightCardResponse, NormalizedHomeWidgets } from "@/api/home/apiGetHomeWidget";
import type { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";
import type { countsSummary, sidebarNode } from "@/api/sidebar/apiGetSidebar";
import type { UserExposure, UserLimits, UserMe } from "@/api/user/apiUsersMe";
import {
  cardListTemp,
  type tCard,
} from "@/app/components/CardListSection/tCard";
import type { TopLeagueItem } from "@/helpers/topLeagueItems";
import type { BetSelection } from "@/shared/utils/EventsUtils";
import type { BetItemType, SelectedOddType, betType } from "@/shared/utils/bet";
import type { LiveStreamDataMap } from "@/shared/utils/liveStream";
import type { tEvent } from "@/types/tEvent";
import type { tMarket } from "@/types/tMarket";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import {
  ReadonlySignal,
  Signal,
  computed,
  signal,
} from "@preact/signals";
import { ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";

export type SelectionStoreEntry = {
  id: number;
  eId: number;
  mId: number;
  etradingStatus: number;
  mtradingStatus: number;
  status: number;
  price: number;
  mv: number;
};

export type EventBetBuilderPriceState = {
  price: number | null;
  combinable: boolean;
  loading: boolean;
  rejectMessage: string | null;
  selectionKey?: string;
};

export type HomeWidgetSelectionEntry = SelectionStoreEntry;

export type OddsChangedLine = {
  label: string;
  oldOdds: number;
  newOdds: number;
};

export type LocationHookType =
  | "useMemoryLocation"
  | "useMemoryLocationWithHistory"
  | "useHashLocation"
  | "useBrowserLocation";

export type SportsbookContextType = {
  // Event store
  storeState: Signal<Record<number, Signal<tEventModel>>>;
  willBeDeletedEventIds: Signal<number | undefined>;
  selectionsStoreState: Signal<
    Record<string, Signal<SelectionStoreEntry> | undefined>
  >;

  // Bet slip & player
  balance: Signal<number>;
  currency: Signal<string>;
  accessToken: Signal<string>;
  selectedBets: Signal<BetSelection[]>;
  selectedOdds: Signal<SelectedOddType[]>;
  selectedBetType: Signal<betType>;
  multipleBetAmount: Signal<number>;
  buildingBetAmount: Signal<number>;
  myBetsState: Signal<BetItemType[]>;
  selectedCashoutBetId: Signal<string | null>;
  selectedCashoutBet: Signal<BetItemType | null>;
  selectedCashoutAmount: Signal<number>;
  selectedBetslipTab: Signal<"bet-slip" | "my-bet">;
  isBonusInfoOpen: Signal<boolean>;
  isOpenedMyBet: Signal<boolean>;
  isBuilding: Signal<boolean>;
  playerProfile: Signal<UserMe | null>;
  playerLimits: Signal<UserLimits | null>;
  playerExposure: Signal<UserExposure | null>;
  playerSessionReady: Signal<boolean>;
  betBuilderPrice: Signal<number | null>;
  betBuilderCombinable: Signal<boolean>;
  betBuilderRejectMessage: Signal<string | null>;
  betBuilderPriceLoading: Signal<boolean>;
  betBuilderPricesByEvent: Signal<Record<number, EventBetBuilderPriceState>>;
  betSlipWarning: Signal<string | null>;
  betSlipIdempotencyKey: Signal<string>;
  isRepeatConfirmOpen: Signal<boolean>;
  selectedRepeatBet: Signal<BetItemType | null>;
  systemBetSpecifier: Signal<Record<number, number>>;

  // Bet history
  betHistoryState: Signal<BetItemType[]>;
  currentPageState: Signal<number>;
  totalPagesState: Signal<number>;
  openBetsTabState: Signal<"open" | "settled">;
  betHistoryRefreshNonce: Signal<number>;

  // Admin refer ordering
  leagueOrderBySportState: Signal<Record<number, number[]>>;
  marketOrderBySportState: Signal<Record<number, number[]>>;
  liveMarketOrderBySportState: Signal<Record<number, number[]>>;

  // Layout & UI
  isMobile: Signal<boolean | undefined>;
  baseColorTheme: Signal<"light" | "dark">;
  bottomLayoutHeight: Signal<number>;
  panelCompactState: Signal<number>;
  currentCompactState: Signal<number | undefined>;
  isOpenedSidebar: Signal<boolean>;
  showSearchState: Signal<boolean>;
  showSearch: Signal<boolean>;

  // Routing
  routeState: Signal<string>;
  routeFullState: Signal<string>;
  routePathState: ReadonlySignal<string>;
  routeQueryState: ReadonlySignal<URLSearchParams>;
  locationHookType: Signal<LocationHookType>;
  selectedEvent: ReadonlySignal<number | undefined>;

  // Sidebar & sports summary
  summarySportsState: Signal<sidebarNode[]>;
  summarySportsLiveState: Signal<LiveSidebarStoreSport[]>;
  countsSummarySportsState: Signal<countsSummary>;
  loadedSidebarState: Signal<boolean>;
  loadedLiveState: Signal<boolean>;
  loadedMatchesState: Signal<boolean>;
  loadedAllMatches: Signal<boolean>;
  loadedSportsbookState: Signal<boolean>;
  liveScrollPos: Signal<number>;

  // Matches & leagues
  popularMatchesState: Signal<MatchDataResponse[]>;
  popularLeaguesState: Signal<TopLeagueItem[]>;
  cardListState: Signal<tCard[]>;
  firstEventState: Signal<[string, number] | undefined>;
  favoriteMatches: Signal<tEvent[]>;
  favoriteMarkets: Signal<tMarket[]>;

  // Markets
  prematchMarkets: Signal<Record<string, tMarket>>;
  liveMarkets: Signal<Record<string, tMarket>>;

  // Dialogs
  isOpenedFavoritesDialog: Signal<boolean>;
  isOpenedCashoutDialog: Signal<boolean>;
  cashoutDialogOnSuccess: Signal<(() => void) | null>;
  isOpenedLiveStreamDialog: Signal<boolean>;
  liveStreamUrl: Signal<string>;
  oddsChangedDialogOpen: Signal<boolean>;
  oddsChangedDialogLines: Signal<OddsChangedLine[]>;
  oddsChangedDialogMessage: Signal<string>;

  // Home widgets
  homeWidgetsRefreshNonce: Signal<number>;
  homeWidgetsCache: Signal<NormalizedHomeWidgets | null>;
  homeWidgetsSelectionsCache: Signal<
    Record<string, Signal<HomeWidgetSelectionEntry>>
  >;
  betBuilderHighlightsCache: Signal<BetBuilderHighlightCardResponse[]>;
  betBuilderHighlightsSportId: Signal<number | null>;

  // Misc
  liveStreamState: Signal<LiveStreamDataMap>;
  translationState: Signal<{
    lang: string;
    translations: Record<string, string>;
  }>;
  teamlogosState: Signal<Record<string, Record<string, string>>>;
  odds88WsConnected: Signal<boolean>;
  userState: Signal<null>;
  modalState: Signal<boolean>;
};

/** Composite key: `{eventId}-{marketId}-{selectionId}` */
export function selectionStoreKey(
  eventId: number,
  marketId: number,
  selectionId: number,
): string {
  return `${eventId}-${marketId}-${selectionId}`;
}

function parseRoutePath(full: string): string {
  const q = full.indexOf("?");
  const h = full.indexOf("#");
  const cut = [q, h].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  return cut != null ? full.slice(0, cut) : full;
}

function parseRouteQuery(full: string): URLSearchParams {
  const q = full.indexOf("?");
  if (q < 0) return new URLSearchParams();
  const end = full.indexOf("#", q);
  const qs = end >= 0 ? full.slice(q + 1, end) : full.slice(q + 1);
  return new URLSearchParams(qs);
}

function parseSelectedEventId(routeFullState: Signal<string>): number | undefined {
  const path = parseRoutePath(routeFullState.value);
  const segments = path.split("/").filter(Boolean);
  const eventViewIndex = segments.indexOf("event-view");

  if (eventViewIndex >= 0 && segments.length >= eventViewIndex + 9) {
    const eventIdStr = segments[eventViewIndex + 8];
    if (eventIdStr) {
      const eventId = Number(eventIdStr);
      return Number.isNaN(eventId) ? undefined : eventId;
    }
  }

  return undefined;
}

export function createSportsbookStore(): SportsbookContextType {
  const isMobile = signal<boolean>();
  const routeState = signal<string>("/");
  const routeFullState = signal<string>("/");

  const routePathState = computed(() => parseRoutePath(routeFullState.value));
  const routeQueryState = computed(() => parseRouteQuery(routeFullState.value));
  const selectedEvent = computed(() => parseSelectedEventId(routeFullState));

  return {
    storeState: signal({}),
    willBeDeletedEventIds: signal<number>(),
    selectionsStoreState: signal({}),

    balance: signal(0),
    currency: signal("USD"),
    accessToken: signal(""),
    selectedBets: signal([]),
    selectedOdds: signal([]),
    selectedBetType: signal("single"),
    multipleBetAmount: signal(0),
    buildingBetAmount: signal(0),
    myBetsState: signal([]),
    selectedCashoutBetId: signal(null),
    selectedCashoutBet: signal(null),
    selectedCashoutAmount: signal(0),
    selectedBetslipTab: signal("bet-slip"),
    isBonusInfoOpen: signal(false),
    isOpenedMyBet: signal(isMobile.value ? false : true),
    isBuilding: signal(false),
    playerProfile: signal(null),
    playerLimits: signal(null),
    playerExposure: signal(null),
    playerSessionReady: signal(false),
    betBuilderPrice: signal(null),
    betBuilderCombinable: signal(false),
    betBuilderRejectMessage: signal(null),
    betBuilderPriceLoading: signal(false),
    betBuilderPricesByEvent: signal({}),
    betSlipWarning: signal(null),
    betSlipIdempotencyKey: signal(crypto.randomUUID()),
    isRepeatConfirmOpen: signal(false),
    selectedRepeatBet: signal(null),
    systemBetSpecifier: signal({}),

    betHistoryState: signal([]),
    currentPageState: signal(1),
    totalPagesState: signal(1),
    openBetsTabState: signal("open"),
    betHistoryRefreshNonce: signal(0),

    leagueOrderBySportState: signal({}),
    marketOrderBySportState: signal({}),
    liveMarketOrderBySportState: signal({}),

    isMobile,
    baseColorTheme: signal("dark"),
    bottomLayoutHeight: signal(64),
    panelCompactState: signal(2),
    currentCompactState: signal<number>(),
    isOpenedSidebar: signal(false),
    showSearchState: signal(false),
    showSearch: signal(false),

    routeState,
    routeFullState,
    routePathState,
    routeQueryState,
    locationHookType: signal("useMemoryLocationWithHistory"),
    selectedEvent,

    summarySportsState: signal([]),
    summarySportsLiveState: signal([]),
    countsSummarySportsState: signal({
      preMatchCount: { counts: {}, totalCount: 0 },
      liveCount: { counts: {}, totalCount: 0 },
      outrightCount: { counts: {}, totalCount: 0 },
    }),
    loadedSidebarState: signal(false),
    loadedLiveState: signal(false),
    loadedMatchesState: signal(false),
    loadedAllMatches: signal(false),
    loadedSportsbookState: signal(false),
    liveScrollPos: signal(0),

    popularMatchesState: signal([]),
    popularLeaguesState: signal([]),
    cardListState: signal(cardListTemp),
    firstEventState: signal<[string, number]>(),
    favoriteMatches: signal([]),
    favoriteMarkets: signal([]),

    prematchMarkets: signal({} as Record<string, tMarket>),
    liveMarkets: signal({} as Record<string, tMarket>),

    isOpenedFavoritesDialog: signal(false),
    isOpenedCashoutDialog: signal(false),
    cashoutDialogOnSuccess: signal(null),
    isOpenedLiveStreamDialog: signal(false),
    liveStreamUrl: signal(""),
    oddsChangedDialogOpen: signal(false),
    oddsChangedDialogLines: signal([]),
    oddsChangedDialogMessage: signal(
      "Odds have changed. Review updated prices before placing again.",
    ),

    homeWidgetsRefreshNonce: signal(0),
    homeWidgetsCache: signal(null),
    homeWidgetsSelectionsCache: signal({}),
    betBuilderHighlightsCache: signal([]),
    betBuilderHighlightsSportId: signal(null),

    liveStreamState: signal({}),
    translationState: signal({ lang: "en", translations: {} }),
    teamlogosState: signal({}),
    odds88WsConnected: signal(false),
    userState: signal(null),
    modalState: signal(false),
  };
}

const sportsbookStore = createSportsbookStore();

const sportsbookStoreContext =
  createContext<SportsbookContextType>(sportsbookStore);

export const SportsbookProvider = ({
  children,
}: {
  children: ComponentChildren;
}) => {
  return (
    <sportsbookStoreContext.Provider value={sportsbookStore}>
      {children}
    </sportsbookStoreContext.Provider>
  );
};

export const useSportsbookStore = (): SportsbookContextType => {
  const context = useContext(sportsbookStoreContext);
  if (!context) {
    throw new Error(
      "useSportsbookStore must be used within a SportsbookProvider",
    );
  }
  return context;
};

export { sportsbookStore };
