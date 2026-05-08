import { isMobile } from "@/state/isMobile";
import { FunctionComponent, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { TabList } from "../components/TabList";
import { BonusInfoDialog } from "@/app/components/BonusInfoDialog";
import { MyBet } from "@/app/components/BetSlip/MyBet";
import { useMediaQuery } from "usehooks-ts";
import {
  accessToken,
  selectedselections,
  selectedBetType,
  multipleBetAmount,
  myBetsState,
  buildingBetAmount,
  isOpenedMyBet,
} from "@/state/betState";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
// import { RepeatConfirmDialog } from "@/app/components/BetSlip/RepeatConfirmDialog";
import { bottomLayoutHeight } from "@/state/bottomLayoutHeight";
import { apiGetAccessToken } from "@/api/apiGetAccessToken";
import { favoriteMatches } from "@/state/Favorite";
import { useRouteParams } from "@/hooks/useRotueParams";
import useSocketEvent from "@/hooks/useSocketEvent";
import { useSocket, useSocketStatus } from "@/context/SocketContext";
import {
  selectionsStoreState,
  storeState,
  willBeDeletedEventIds,
} from "@/state/storeState";
import { summarySports, summarySportsLive } from "@/state/summarySports";
import { Signal } from "@preact/signals";
import { Search } from "../components/Search";
import { getAppConfig } from "@/shared/config/appConfig";
import { CashoutDialog } from "../components/BetSlip/CashoutDialog";
import { useLocation } from "wouter-preact";

interface MainLayoutProps {
  children: JSX.Element | JSX.Element[];
}

export const MainLayout: FunctionComponent<MainLayoutProps> = ({
  children,
}) => {
  const { pageName, eventId } = useRouteParams();
  const socket = useSocket();
  const socketConnected = useSocketStatus();
  const [, setLocation] = useLocation();
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const getAccessToken = async () => {
    const response = await apiGetAccessToken();
    accessToken.value = response?.data.access_token || "";
  };

  const { baseTheme } = getAppConfig();

  useEffect(() => {
    if (selectedselections.value.length === 0) {
      window.localStorage.removeItem("selectedBets");
      return;
    }
    const selectedBetsData = {
      selectedselections: selectedselections.value,
      selectedBetType: selectedBetType.value,
      multipleBetAmount: multipleBetAmount.value,
      buildingBetAmount: buildingBetAmount.value,
    };
    window.localStorage.setItem(
      "selectedBets",
      JSON.stringify(selectedBetsData),
    );
  }, [
    selectedselections.value,
    selectedBetType.value,
    multipleBetAmount.value,
    buildingBetAmount.value,
  ]);

  useEffect(() => {
    if (!pageName) setLocation("/event-view");
  }, [pageName]);

  const getSBetsData = () => {
    const selectedBetsData = window.localStorage.getItem("selectedBets");
    const myBetsData = window.localStorage.getItem("my_bets");
    if (selectedBetsData) {
      const selectedBetsDataObj = JSON.parse(selectedBetsData);
      selectedselections.value = selectedBetsDataObj.selectedselections;
      selectedBetType.value = selectedBetsDataObj.selectedBetType;
      multipleBetAmount.value = selectedBetsDataObj.multipleBetAmount;
      buildingBetAmount.value = selectedBetsDataObj.buildingBetAmount;
    }
    const myBetsDataObj = JSON.parse(myBetsData || "[]");
    myBetsState.value = myBetsDataObj;
  };

  useEffect(() => {
    getAccessToken();
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
    // console.log("Socket connected:", socketConnected);
    // console.log("Socket instance:", socket);
  }, [socketConnected, socket]);

  // console.log(
  //   "stylevalue",
  //   JSON.stringify({
  //     "--background-header": "#010502",
  //     "--background-color": "#010502",
  //     "--background-color-dark": "#010502",
  //     "--background-element": "#121713",
  //     "--background-element-dark": "#010502",
  //     "--highlight-background": "#b8c5e066",
  //     "--highlight-background-dark": "#b8c5e045",

  //     "--sub-element-color": "#ffffff",
  //     "--sub-element-color-dark": "#121713",

  //     "--sub-element-secondary": "#f7f9fc",
  //     "--sub-element-secondary-dark": "#1d251f",

  //     "--border-color": "#cdd1dd",
  //     "--border-color-dark": "#2d374d",
  //     "--primary-border-color": "#d1d9eb",
  //     "--focused-primary-border-color": "#a9b9d1",

  //     "--primary-color": "#00a727",

  //     "--text-primary-color": "#01a825",
  //     "--text-primary-color-dark": "#7aa7ff",
  //     "--text-basic-color": "#212536",
  //     "--text-basic-color-dark": "#c9c9c9",
  //     "--text-sub-color": "#526789",
  //     "--text-sub-color-dark": "#c0cce7",
  //     "--text-green": "#79d297",
  //     "--text-blue": "#154fc1",
  //     "--text-red": "#ff3449",
  //     "--text-yellow": "#ffd700",
  //     "--green-color": "#109121",
  //     "--greenblue-color": "#1a7051",
  //   }),
  // );

  // useSocketEvent(
  //   "f",
  //   (data: { i: number; s: string; sd: number; t: 1 | 2 }) => {
  //     const evSig = storeState.value[data.i];
  //     if (!evSig) return;
  //     const prev = evSig.value;
  //     console.log(
  //       "received 'f' event for eventId:",
  //       data.i,
  //       "with status:",
  //       data.s,
  //     );
  //     if (
  //       data.s === "Finished" ||
  //       data.s === "Coverage lost" ||
  //       data.s === "PreFinished"
  //     ) {
  //       if (
  //         summarySports.value.data[prev.sport]?.[prev.region]?.[prev.league]?.[
  //           data.i
  //         ]
  //       ) {
  //         delete summarySports.value.data[prev.sport][prev.region][prev.league][
  //           data.i
  //         ];
  //         const sportCounts = summarySports.value.counts[prev.sport];
  //         if (sportCounts) {
  //           sportCounts.total -= 1;
  //           const regionCounts = sportCounts.regions?.[prev.region];
  //           if (regionCounts) {
  //             regionCounts.total -= 1;
  //             const leagueCount = regionCounts.leagues?.[prev.league];
  //             if (leagueCount) {
  //               regionCounts.leagues[prev.league] -= 1;
  //             }
  //           }
  //         }
  //       }
  //       delete summarySports.value.data[prev.sport]?.[prev.region]?.[
  //         prev.league
  //       ]?.[data.i];
  //       summarySports.value = { ...summarySports.value };
  //       if (
  //         summarySportsLive.value.data[prev.sport]?.[prev.region]?.[
  //           prev.league
  //         ]?.[data.i]
  //       ) {
  //         delete summarySportsLive.value.data[prev.sport][prev.region][
  //           prev.league
  //         ][data.i];
  //         const sportCounts = summarySportsLive.value.counts[prev.sport];
  //         if (sportCounts) {
  //           sportCounts.total -= 1;
  //           const regionCounts = sportCounts.regions?.[prev.region];
  //           if (regionCounts) {
  //             regionCounts.total -= 1;
  //             const leagueCount = regionCounts.leagues?.[prev.league];
  //             if (leagueCount) {
  //               regionCounts.leagues[prev.league] -= 1;
  //             }
  //           }
  //         }
  //       }
  //       summarySportsLive.value = { ...summarySportsLive.value };
  //       if (eventId && parseInt(eventId) === data.i) {
  //         willBeDeletedEventIds.value = data.i;
  //       } else {
  //         delete storeState.value[data.i];
  //         storeState.value = { ...storeState.value };
  //         return;
  //       }
  //     }
  //     evSig.value = {
  //       ...prev,
  //       status: data.s,
  //       startDate: data.sd,
  //       // type: data.t,
  //     };
  //   },
  // );

  // useSocketEvent("m", ({ e, i, s }) => {
  //   if (!storeState.value[e]) return;

  //   const marketSig = storeState.value[e].value.markets?.[i];
  //   const oddStoreSig = Object.values(selectionsStoreState.value).filter(
  //     (odd) => odd.value.mId === i,
  //   );
  //   if (!marketSig && !oddStoreSig) return;
  //   if (marketSig) {
  //     marketSig.value = { ...marketSig.value, status: s };
  //   }
  //   oddStoreSig.forEach((odd) => {
  //     odd.value = { ...odd.value, mStatus: s };
  //   });
  //   return;
  // });

  // useSocketEvent("o", (data) => {
  //   const oddStoreSig = selectionsStoreState.value[data.i];
  //   const oddSig = storeState.value[data.e]?.value?.markets?.[data.m]?.value
  //     ?.selections?.selections?.[data.i] as Signal<tSelectionValue> | undefined;

  //   if (!oddSig && !oddStoreSig) return;

  //   const patch = {
  //     value: data.v,
  //     status: data.s,
  //     mv: data.mv,
  //   };

  //   if (oddSig) {
  //     oddSig.value = {
  //       ...oddSig.value,
  //       ...patch,
  //     };
  //   }

  //   if (oddStoreSig) {
  //     oddStoreSig.value = {
  //       ...oddStoreSig.value,
  //       ...patch,
  //     };
  //   }
  // });

  useEffect(() => {
    if (willBeDeletedEventIds.value)
      delete storeState.value[willBeDeletedEventIds.value];
  }, [eventId]);

  useEffect(() => {
    if (isMobile.value) {
      isOpenedMyBet.value = false;
    } else {
      isOpenedMyBet.value = true;
    }
  }, [isMobile.value]);

  // const { baseTheme } = getAppConfig();
  // const currentRoot = mainLayoutRef.current?.getRootNode() as
  //   | ShadowRoot
  //   | Document;
  // useEffect(() => {
  //   if (currentRoot instanceof ShadowRoot) {
  //     currentRoot.host.setAttribute("data-theme", baseTheme || "dark");
  //   } else {
  //     document.documentElement.setAttribute("data-theme", baseTheme || "dark");
  //   }
  // }, [baseTheme, currentRoot]);

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
        {/* <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/search.png`}
          className="w-6 h-6 hidden md:flex brightness-0 invert absolute z-[100] right-5 top-4 cursor-pointer"
          onClick={() => {
            showSearchState.value = !showSearchState.value;
          }}
        /> */}
        {children}
        <BonusInfoDialog />
        <MyBet />
        <Search />
        <CashoutDialog />
        {/* <RepeatConfirmDialog /> */}
      </div>
    </div>
  );
};
