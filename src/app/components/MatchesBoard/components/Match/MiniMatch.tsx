import { FunctionComponent } from "preact";
import { useCallback, useRef } from "preact/hooks";
import { useLocation } from "wouter-preact";

import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { Market as MarketComponent } from "./Market";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import {
  tEventModel,
  tMarketModel,
} from "@/types/typesForSocket.ts/tEventModel";
import { MiniMatchLoader } from "@/app/components/Loading";
import { useImperativeLiveClock } from "@/hooks/useLiveClock";

interface MiniMatchProps {
  selectedEventId: number;
  marketSlug: string;
  loading?: boolean;
}

/** Pull a competitor's score from the new `scoreboard` payload. */
const getCompetitorScore = (scoreboard: any, position: 1 | 2): number => {
  if (!scoreboard) return 0;
  const fromResults = scoreboard.results?.find(
    (r: any) => r.competitorPosition === position,
  )?.value;
  const parsedResult = Number(fromResults);
  if (Number.isFinite(parsedResult)) return parsedResult;
  const fallback =
    position === 1 ? scoreboard.homeGameScore : scoreboard.awayGameScore;
  const parsedFallback = Number(fallback);
  return Number.isFinite(parsedFallback) ? parsedFallback : 0;
};

export const MiniMatch: FunctionComponent<MiniMatchProps> = ({
  selectedEventId,
  marketSlug,
  loading = false,
}) => {
  const { isMobile, storeState } = useSportsbookStore();
  const [, setLocation] = useLocation();
  const match = storeState.value[selectedEventId]?.value;
  const clockRef = useRef<HTMLSpanElement>(null);

  const scoreboard = match?.scoreboard;
  const homeGoals = getCompetitorScore(scoreboard, 1);
  const awayGoals = getCompetitorScore(scoreboard, 2);

  const rawTime = typeof scoreboard?.time === "number" ? scoreboard.time : null;
  const showClock = match?.status === 3 && rawTime !== null && !!match;

  useImperativeLiveClock(clockRef, rawTime, showClock);

  const getTeamNames = useCallback(
    (m: tEventModel | undefined): { homeTeam: string; awayTeam: string } => {
      const home = m?.competitors?.[0]?.name || "Team 1";
      const away = m?.competitors?.[1]?.name || "Team 2";
      return { homeTeam: home, awayTeam: away };
    },
    [],
  );

  const { homeTeam, awayTeam } = getTeamNames(match);

  // The new market model is a record of signal-wrapped markets — unwrap to
  // plain values so we can run name-based heuristics against it.
  const marketsList: tMarketModel[] = match?.markets
    ? Object.values(match.markets).map((sig) => sig.value)
    : [];

  const selectedMarket =
    marketsList.find((m) => {
      const name = (m?.name || "").toLowerCase();
      const slug = (marketSlug || "").toLowerCase();

      const nameMatch =
        name.includes(slug === "winner" ? "match result" : slug) ||
        name.includes(slug);
      return (
        nameMatch ||
        name.includes("match result") ||
        name.includes("winner") ||
        name.includes("total") ||
        name.includes("handicap")
      );
    }) ?? marketsList[0];

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
  if (!match || !marketsList.length) return null;

  const isLive = match.status === 3;

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
              `/event-view/${isLive ? "live" : "pre-match"}/${match.sport?.name}/${match.sport?.id}/${match.region?.name}/${match.region?.id}/${match.league?.name}/${match.league?.id}/${match.id}`,
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
              {/* Team logo omitted — names only. */}
              {/*
              <img
                src={
                  cachedTeamLogoUrl(match.sport?.name, homeTeam) ||
                  `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                }
                className="w-[14px] h-[14px] object-contain shrink-0"
                alt=""
              />
              */}
              {homeTeam}
            </div>
            <div className="flex items-center gap-2 text-[12px] min-w-0 truncate text-ellipsis overflow-hidden">
              {/*
              <img
                src={
                  cachedTeamLogoUrl(match.sport?.name, awayTeam) ||
                  `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                }
                className="w-[14px] h-[14px] object-contain shrink-0"
                alt=""
              />
              */}
              {awayTeam}
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
            {isLive && (
              <>
                <span className="text-[12px]">{homeGoals}</span>
                <span className="text-[12px]">{awayGoals}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full h-full gap-2">
          {selectedMarket ? (
            <MarketComponent
              key={match.id}
              marketId={selectedMarket.id}
              single={true}
              eventId={match.id}
            />
          ) : (
            <EmptyMarketPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
};
