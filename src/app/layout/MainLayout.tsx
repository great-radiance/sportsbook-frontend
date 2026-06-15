import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { FunctionComponent, JSX } from "preact";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { TabList } from "../components/TabList";
import { BonusInfoDialog } from "@/app/components/BonusInfoDialog";
import { useMediaQuery } from "usehooks-ts";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import {
  normalizeSelectedOddRow,
  type SelectedOddType,
} from "@/shared/utils/bet";
import { useRouteParams } from "@/hooks/useRotueParams";
import { Search } from "../components/Search";
import { getAppConfig } from "@/shared/config/appConfig";
import { CashoutDialog } from "../components/BetSlip/CashoutDialog";
import { OddsChangedDialog } from "../components/BetSlip/OddsChangedDialog";
import { useLocation } from "wouter-preact";
// import { useOdds88WebSocket } from "@/hooks/useOdds88WebSocket";
import { loadPlayerSession } from "@/helpers/loadPlayerSession";
import { notify } from "@/shared/toast";
import useSocketEvent from "@/hooks/useSocketEvent";
import { useSocket, useSocketStatus } from "@/context/SocketContext";
import {
  storeEvent,
  storeSelection,
  syncSelectionsStoreFromIncomingMarkets,
} from "@/helpers/storeEvent";
import {
  addEventToSummarySports,
  removeEventFromSummarySports,
} from "@/helpers/removeEventFromSummarySports";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";

interface MainLayoutProps {
  children: JSX.Element | JSX.Element[];
}

export const MainLayout: FunctionComponent<MainLayoutProps> = ({
  children,
}) => {
  const {
    isMobile,
    selectedOdds,
    selectedBetType,
    multipleBetAmount,
    myBetsState,
    buildingBetAmount,
    isOpenedMyBet,
    currency,
    bottomLayoutHeight,
    favoriteMatches,
    selectionsStoreState,
    storeState,
    willBeDeletedEventIds,
  } = useSportsbookStore();
  const { pageName, eventId, sportIdParam, regionIdParam, leagueIdParam } =
    useRouteParams();
  const [, setLocation] = useLocation();
  const { baseTheme } = getAppConfig();
  const socket = useSocket();
  const isConnected = useSocketStatus();

  const activeEventId = useMemo(() => {
    const id = parseInt(eventId ?? "", 10);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [eventId]);

  const eventIds = useMemo(
    () => Object.keys(storeState.value).map(Number),
    [storeState.value],
  );

  useEffect(() => {
    // console.log("eventIds=========", eventIds);
  }, [eventIds]);

  useEffect(() => {
    // console.log("selectionsStoreState=========", selectionsStoreState.value);
  }, [selectionsStoreState.value]);

  useEffect(() => {
    if (!socket || !isConnected || !eventIds?.length) return;

    socket.emit("subscribe", {
      eventIds,
    });

    console.log("subscribe", socket.id, eventIds);

    return () => {
      socket.emit("unsubscribe", {
        eventIds,
      });
    };
  }, [socket, isConnected, eventIds]);

  const handleEventsUpdated = useCallback((data: any) => {
    // console.log("event:update", data);
    const event = storeState.value[data.eventId];
    // console.log("event", event.value);
    if (data.terminal) {
      const terminalEventId = Number(data.eventId);
      syncSelectionsStoreFromIncomingMarkets(
        terminalEventId,
        data.data.markets,
        data.data.eventInfo.tradingStatus,
      );
      removeEventFromSummarySports(terminalEventId);
      delete storeState.value[terminalEventId];
      storeState.value = { ...storeState.value };
    } else {
      storeEvent(data.data as MatchDataResponse);
    }
  }, []);

  const handleEventNotification = useCallback(
    (data: { data: MatchDataResponse; eventId: number; terminal: boolean }) => {
      const event = storeState.value[data.eventId];
      if (data.terminal) {
        removeEventFromSummarySports(data.eventId);
        delete storeState.value[data.eventId];
        storeState.value = { ...storeState.value };
        syncSelectionsStoreFromIncomingMarkets(
          data.eventId,
          data.data.markets,
          data.data.eventInfo.tradingStatus,
        );
      } else {
        addEventToSummarySports(data.data as MatchDataResponse);
        const shouldStore = useMemo(() => {
          if (event) return true;
          if (leagueIdParam) {
            return (
              parseInt(leagueIdParam) === data.data.eventInfo.competition?.id
            );
          }
          if (regionIdParam) {
            return parseInt(regionIdParam) === data.data.eventInfo.country?.id;
          }
          if (sportIdParam) {
            return parseInt(sportIdParam) === data.data.eventInfo.sport?.id;
          }
          return true;
        }, [sportIdParam, regionIdParam, leagueIdParam]);
        if (shouldStore) {
          storeEvent(data.data as MatchDataResponse);
        } else {
          syncSelectionsStoreFromIncomingMarkets(
            data.eventId,
            data.data.markets,
            data.data.eventInfo.tradingStatus,
          );
        }
      }
      // console.log("event:notification", data);
    },
    [],
  );

  useSocketEvent("event:update", handleEventsUpdated);
  // useSocketEvent("event:notification", handleEventNotification);

  useEffect(() => {
    // console.log("selectedOdds-mainlayout", selectedOdds.value);
    if (selectedOdds.value.length === 0) {
      window.localStorage.removeItem("selectedOdds");
      window.localStorage.removeItem("selectedBets");
      return;
    }

    const selectedBetsData = {
      selectedOdds: selectedOdds.value,
      selectedBetType: selectedBetType.value,
      multipleBetAmount: multipleBetAmount.value,
      buildingBetAmount: buildingBetAmount.value,
    };
    window.localStorage.setItem(
      "selectedOdds",
      JSON.stringify(selectedOdds.value),
    );
    window.localStorage.setItem(
      "selectedBets",
      JSON.stringify(selectedBetsData),
    );
  }, [
    selectedOdds.value,
    selectedBetType.value,
    multipleBetAmount.value,
    buildingBetAmount.value,
  ]);

  useEffect(() => {
    if (!pageName) setLocation("/event-view");
  }, [pageName]);

  const getSBetsData = () => {
    const slipRaw =
      window.localStorage.getItem("selectedOdds") ||
      window.localStorage.getItem("selectedBets");
    const myBetsData = window.localStorage.getItem("my_bets");
    if (slipRaw) {
      try {
        const parsed = JSON.parse(slipRaw);
        const normalizeSlip = (rows: unknown[]) =>
          rows.map((row) => normalizeSelectedOddRow(row as SelectedOddType));
        if (Array.isArray(parsed)) {
          selectedOdds.value = normalizeSlip(parsed);
        } else if (parsed?.selectedOdds && Array.isArray(parsed.selectedOdds)) {
          selectedOdds.value = normalizeSlip(parsed.selectedOdds);
          selectedBetType.value = parsed.selectedBetType ?? "single";
          multipleBetAmount.value = parsed.multipleBetAmount ?? 0;
          buildingBetAmount.value = parsed.buildingBetAmount ?? 0;
        } else if (
          parsed?.selectedselections &&
          Array.isArray(parsed.selectedselections)
        ) {
          /* legacy key — ignore */
        } else if (parsed?.selectedBetType) {
          selectedBetType.value = parsed.selectedBetType;
          multipleBetAmount.value = parsed.multipleBetAmount ?? 0;
          buildingBetAmount.value = parsed.buildingBetAmount ?? 0;
        }
      } catch {
        /* ignore corrupt slip */
      }
    }
    const myBetsDataObj = JSON.parse(myBetsData || "[]");
    myBetsState.value = myBetsDataObj;
  };

  useEffect(() => {
    (async () => {
      const cfg = getAppConfig();
      currency.value = cfg.currency ?? currency.value;

      let deviceId = window.localStorage.getItem("sb_device_id");
      if (!deviceId) {
        deviceId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `dev_${Date.now()}`;
        window.localStorage.setItem("sb_device_id", deviceId);
      }
    })();
    getSBetsData();
    const favoriteMatchesData = window.localStorage.getItem("favoriteMatches");
    if (favoriteMatchesData) {
      favoriteMatches.value = JSON.parse(favoriteMatchesData);
    }
  }, []);

  const isMobileHook = useMediaQuery("(max-width: 768px)");

  isMobile.value = isMobileHook;
  useEffect(() => {
    betSlipExpanded.value = !isMobile.value;
  }, [isMobile.value]);

  useEffect(() => {
    if (willBeDeletedEventIds.value) {
      delete storeState.value[willBeDeletedEventIds.value];
      storeState.value = { ...storeState.value };
    }
  }, [eventId]);

  useEffect(() => {
    if (isMobile.value) {
      isOpenedMyBet.value = false;
    } else {
      isOpenedMyBet.value = true;
    }
  }, [isMobile.value]);

  return (
    <div
      id="sportsbook-main-layout"
      data-theme={baseTheme || "dark"}
      className={`${pageName === "live" ? "bg-[var(--background-color)]" : "bg-[var(--background-color)]"}  flex w-full h-full max-w-full body-content flex-col relative`}
      style={{
        paddingBottom: bottomLayoutHeight.value + 50 + "px",
      }}
    >
      <div className="flex flex-col relative w-full h-full mx-auto">
        <TabList />
        {children}
        <BonusInfoDialog />
        {/* <MyBet /> */}
        <Search />
        <CashoutDialog />
        <OddsChangedDialog />
      </div>
    </div>
  );
};
