import { FunctionComponent } from "preact";
import { Live, Market } from "@/shared/utils/types";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useLocation } from "wouter-preact";
import { Market as MarketComponent } from "./Market";
import { isMobile } from "@/state/isMobile";
import { liveMarkets as liveMarketsState } from "@/state/liveMarkets";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useRouteParams } from "@/hooks/useRotueParams";
import { favoriteMatches } from "@/state/Favorite";
import { storeState } from "@/state/storeState";
import {
  tEventModel,
  tMarketModel,
} from "@/types/typesForSocket.ts/tEventModel";
import { MiniMatchLoader } from "@/app/components/Loading";
import { computed } from "@preact/signals-core";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";
import { normalizeScoreboardFast } from "@/helpers/normalizeScoreboard";
import { getTeamlogo } from "@/helpers/getTeamlogos";
import { getTranslatedText } from "@/helpers/getTranslate";

interface MiniMatchProps {
  selectedEventId: number;
  marketSlug: string;
  loading?: boolean;
}

const formatMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}'`;
};

export const MiniMatch: FunctionComponent<MiniMatchProps> = ({
  selectedEventId,
  marketSlug,
  loading = false,
}) => {
  const [, setLocation] = useLocation();
  const { eventId } = useRouteParams();
  const match = storeState.value[selectedEventId]?.value;
  const clockRef = useRef<HTMLSpanElement>(null);

  // const live = storeState.value[match?.id]?.value.live ?? null;
  const markets = match?.markets || null;
  const normalizeScoreboard = normalizeScoreboardFast(match?.live?.scoreBoard);

  const rawTime =
    match?.live?.status?.time ||
    match?.live?.clock?.clock_seconds ||
    normalizeScoreboard?.clock?.seconds ||
    null;

  const showClock =
    match?.status !== "Finished" &&
    match?.status !== "Coverage lost" &&
    !!match &&
    rawTime !== null &&
    match?.live?.clock?.clock_status !== "stopped";

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const getTeamNames = useCallback(
    (m: tEventModel): { homeTeam: string; awayTeam: string } => {
      if (m?.participants) {
        return {
          homeTeam: m?.participants[0]?.name || "Team 1",
          awayTeam: m?.participants[1]?.name || "Team 2",
        };
      }
      return { homeTeam: "Team 1", awayTeam: "Team 2" };
    },
    [],
  );

  const { homeTeam, awayTeam } = getTeamNames(match);

  // const homeGoals =
  //   live?.scoreBoard && "goals" in live.scoreBoard
  //     ? (live.scoreBoard.goals as { h: number; g: number }).h || 0
  //     : 0;

  // const awayGoals =
  //   live?.scoreBoard && "goals" in live.scoreBoard
  //     ? (live.scoreBoard.goals as { h: number; g: number }).g || 0
  //     : 0;

  // const liveMinutes = live?.status?.time
  //   ? live.status.time
  //   : live?.scoreBoard && "time" in live.scoreBoard
  //     ? (live.scoreBoard as { time: string }).time
  //     : null;

  // const minutesDisplay = liveMinutes
  //   ? typeof liveMinutes === "string"
  //     ? liveMinutes
  //     : formatMinutes(liveMinutes as number)
  //   : null;

  // if (!Array.isArray(markets) || markets.length === 0) return undefined;

  // const desiredId = liveMarketsState.value[marketSlug]?.marketInfo?.id;
  const marketsList = Object.values(markets || {}).map((sig) => sig.value);
  const selectedMarket =
    marketsList.find((m) => {
      const name = (m?.name || "").toLowerCase();
      const slug = (marketSlug || "").toLowerCase();

      const nameMatch =
        name.includes(slug === "winner" ? "match result" : slug) ||
        name.includes(slug);
      // const winnerMarket = name.includes("match result") || name.includes("winner");
      return (
        nameMatch ||
        name.includes("match result") ||
        name.includes("winner") ||
        name.includes("total") ||
        name.includes("handicap")
      );
    }) ??
    // marketsList[0] ??
    ({} as tMarketModel);

  const EmptyMarketPlaceholder = () => (
    <div
      className={`flex w-full gap-[2px] ${isMobile.value ? "h-full" : "h-[34px]"}`}
    >
      <div className="flex w-full h-full bg-[var(--sub-element-secondary)] border border-[var(--border-color)] items-center justify-center rounded-[8px]">
        <span className="text-[var(--text-sub-color)] text-[12px]">
          There are no available markets
        </span>
      </div>
    </div>
  );
  if (loading) return <MiniMatchLoader />;
  console.log("minimatchMarkets", markets);
  if (!match || !marketsList.length) return null;

  return (
    <div
      className={`flex flex-col w-full max-w-[300px] text-[var(--text-basic-color)] bg-[var(--sub-element-color)] p-3 rounded-[8px] h-full`}
    >
      <div className="flex flex-col w-full h-full p-1 pb-2 gap-1">
        <div
          onClick={(e) => {
            e.stopPropagation();
            linkButtonOnClick(
              e,
              `/event-view/${
                match?.status === "Not started yet" ? "pre-match" : "live"
              }/${match?.sport}/${match?.region}/${match?.league}/${match?.id}`,
              setLocation,
            );
          }}
          className="flex w-full h-full cursor-pointer"
        >
          <div className="flex flex-col w-full items-start justify-center h-full overflow-hidden">
            <span ref={clockRef} className="pb-3">
              00:00
            </span>
            <div className="flex items-center gap-2 text-[12px] min-w-0 truncate text-ellipsis overflow-hidden">
              <img
                src={
                  getTeamlogo(match.sport, homeTeam) ||
                  `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                }
                className="w-[14px] h-[14px] object-contain shrink-0"
                alt=""
              />
              {getTranslatedText(homeTeam)}
            </div>
            <div className="flex items-center gap-2 text-[12px] min-w-0 truncate text-ellipsis overflow-hidden">
              <img
                src={
                  getTeamlogo(match.sport, awayTeam) ||
                  `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                }
                className="w-[14px] h-[14px] object-contain shrink-0"
                alt=""
              />
              {getTranslatedText(awayTeam)}
            </div>
          </div>

          <div className="flex flex-col items-end justify-center h-full">
            <div className="flex gap-1 items-center pb-3 justify-end">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/stream.png`}
                alt="Statistics"
                className="w-[14px] h-[14px]"
              />
            </div>
            <span className="text-[12px]">
              {normalizeScoreboard?.mainScore?.home}
            </span>
            <span className="text-[12px]">
              {normalizeScoreboard?.mainScore?.away}
            </span>
          </div>
        </div>

        <div className="flex w-full h-full gap-2">
          {selectedMarket ? (
            <MarketComponent
              key={match?.id}
              marketId={selectedMarket.id}
              single={true}
              eventId={match?.id}
            />
          ) : (
            <EmptyMarketPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
};
