import { isMobile } from "@/state/isMobile";
import { FunctionComponent, JSX } from "preact";
import { useEffect, useMemo } from "preact/hooks";
import { TabList } from "../components/TabList";
import { BonusInfoDialog } from "@/app/components/BonusInfoDialog";
import { MyBet } from "@/app/components/BetSlip/MyBet";
import { useMediaQuery } from "usehooks-ts";
import {
  selectedOdds,
  selectedBetType,
  multipleBetAmount,
  myBetsState,
  buildingBetAmount,
  isOpenedMyBet,
  balance,
  currency,
} from "@/state/betState";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import { bottomLayoutHeight } from "@/state/bottomLayoutHeight";
import {
  apiGetUsersMe,
  apiGetUsersMeExposure,
  apiGetUsersMeLimits,
  canPlayerPlaceBets,
} from "@/api/user/apiUsersMe";
import { playerExposure } from "@/state/betState";
import {
  playerLimits,
  playerProfile,
  playerSessionReady,
} from "@/state/betState";
import { favoriteMatches } from "@/state/Favorite";
import { useRouteParams } from "@/hooks/useRotueParams";
import { storeState, willBeDeletedEventIds } from "@/state/storeState";
import { Search } from "../components/Search";
import { getAppConfig } from "@/shared/config/appConfig";
import { CashoutDialog } from "../components/BetSlip/CashoutDialog";
import { OddsChangedDialog } from "../components/BetSlip/OddsChangedDialog";
import { useLocation } from "wouter-preact";
import { useOdds88WebSocket } from "@/hooks/useOdds88WebSocket";
import { parseRouteIds } from "@/helpers/odds88/applyOdds88WsMessage";

interface MainLayoutProps {
  children: JSX.Element | JSX.Element[];
}

export const MainLayout: FunctionComponent<MainLayoutProps> = ({
  children,
}) => {
  const { pageName, eventId, sportIdParam, regionIdParam } = useRouteParams();
  const [, setLocation] = useLocation();
  const { baseTheme } = getAppConfig();

  const activeEventId = useMemo(() => {
    const id = parseInt(eventId ?? "", 10);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [eventId]);

  const routeIds = useMemo(
    () => parseRouteIds(sportIdParam, regionIdParam),
    [sportIdParam, regionIdParam],
  );

  useOdds88WebSocket({
    activeEventId,
    ...routeIds,
    enabled: true,
  });

  useEffect(() => {
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
        if (Array.isArray(parsed)) {
          selectedOdds.value = parsed;
        } else if (parsed?.selectedOdds && Array.isArray(parsed.selectedOdds)) {
          selectedOdds.value = parsed.selectedOdds;
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
      balance.value = cfg.xUserBalance ?? balance.value;
      currency.value = cfg.currency ?? currency.value;

      let deviceId = window.localStorage.getItem("sb_device_id");
      if (!deviceId) {
        deviceId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `dev_${Date.now()}`;
        window.localStorage.setItem("sb_device_id", deviceId);
      }

      try {
        const [me, limits, exposure] = await Promise.all([
          apiGetUsersMe(),
          apiGetUsersMeLimits().catch(() => null),
          apiGetUsersMeExposure().catch(() => null),
        ]);
        playerProfile.value = me;
        playerLimits.value = limits;
        playerExposure.value = exposure;
        if (me.currency) currency.value = me.currency;
        if (!canPlayerPlaceBets(me.status)) {
          console.warn("Player cannot bet — status:", me.status);
        }
      } catch (e) {
        console.warn("GET /users/me failed:", e);
        playerProfile.value = null;
      } finally {
        playerSessionReady.value = true;
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
      <div className="flex flex-col relative w-full h-full max-w-[1920px] mx-auto">
        <TabList />
        {children}
        <BonusInfoDialog />
        <MyBet />
        <Search />
        <CashoutDialog />
        <OddsChangedDialog />
      </div>
    </div>
  );
};
