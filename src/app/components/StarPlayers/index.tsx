import { FunctionComponent } from "preact";
import { TopPlayerCard, StarPlayerCardData } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import "./style.scss";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { popularMatchesState } from "@/state/popularMatchesState";
import { handleClickOdd } from "../MatchesBoard/components/Match/Market";

const PLAYER_MARKET_KEYWORDS = [
  "player",
  "anytime goalscorer",
  "goalscorer",
  "to score",
  "player shots",
  "shots on target",
  "player assists",
  "assist",
  "player cards",
  "to be booked",
];

const formatOddName = (
  oddName: any,
  participants: Array<{ name?: string }>,
): string => {
  if (oddName?.h) return String(oddName.h);
  const code = oddName?.e;
  if (!code) return "Selection";
  if (code === "1") return `${participants[0]?.name || "Home"} Win`;
  if (code === "0") return "Draw";
  if (code === "2") return `${participants[1]?.name || "Away"} Win`;
  if (code === "yes") return "Yes";
  if (code === "no") return "No";
  return String(code);
};

const extractPlayerName = (marketName: string, outcomeName: string): string => {
  const source = `${marketName} ${outcomeName}`.trim();
  const splitByDash = source.split(" - ")[0];
  const splitByTo = splitByDash.split(" to ")[0];
  const cleaned = splitByTo
    .replace(/shots on target|shots|to score|assists|cards|booked/gi, "")
    .trim();
  return cleaned.length >= 3 ? cleaned : "Star Player";
};

const isLikelyPlayerName = (name: string): boolean => {
  if (!name || name === "Star Player") return false;
  const normalized = name.trim();
  if (normalized.length < 5) return false;
  const genericTokens = [
    "home",
    "away",
    "draw",
    "over",
    "under",
    "yes",
    "no",
    "selection",
    "result",
    "total",
    "handicap",
    "team",
    "both teams",
  ];
  const lower = normalized.toLowerCase();
  if (genericTokens.some((token) => lower.includes(token))) return false;

  // Must look like a person-style name: at least two text parts.
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;

  // At least one part should begin uppercase and contain letters.
  return parts.some((part) => /^[A-Z][A-Za-z.'-]+$/.test(part));
};

const getPopularMatchIds = (popularMatches: any): number[] => {
  const ids: number[] = [];
  Object.keys(popularMatches).forEach((sport) => {
    Object.keys(popularMatches[sport] ?? {}).forEach((region) => {
      Object.keys(popularMatches[sport][region] ?? {}).forEach((league) => {
        ids.push(...(popularMatches[sport][region][league] ?? []));
      });
    });
  });
  return Array.from(new Set(ids));
};

const buildStarPlayers = (
  popularMatches: any,
  store: Record<number, any>,
): StarPlayerCardData[] => {
  const ids = getPopularMatchIds(popularMatches);
  const rows: StarPlayerCardData[] = [];
  for (const id of ids) {
    const event = store[id]?.value;
    if (!event || !event.markets || !event.participants?.length) continue;
    const matchName = `${event.participants[0]?.name || "Home"} - ${event.participants[1]?.name || "Away"}`;

    for (const [marketId, marketSig] of Object.entries(event.markets)) {
      const market = (marketSig as any)?.value;
      if (!market?.odds?.odds) continue;
      const marketName = String(market.name || "");
      const lowerMarket = marketName.toLowerCase();

      Object.entries(market.odds.odds).forEach(([oddId, oddSig]: [string, any]) => {
        const odd = oddSig?.value;
        const oddStatus = String(odd?.status || "").toLowerCase();
        const oddValue = Number(odd?.value);
        if (!(oddStatus === "nu" || oddStatus === "new" || oddStatus === "active"))
          return;
        if (!Number.isFinite(oddValue) || oddValue <= 1.01) return;

        const outcomeName = formatOddName(odd?.name, event.participants);
        const lowerOutcome = outcomeName.toLowerCase();
        const isPlayerMarket = PLAYER_MARKET_KEYWORDS.some(
          (k) => lowerMarket.includes(k) || lowerOutcome.includes(k),
        );
        if (!isPlayerMarket) return;
        const playerName = extractPlayerName(marketName, outcomeName);
        if (!isLikelyPlayerName(playerName)) return;

        rows.push({
          oddsId: oddId,
          eventId: event.id,
          playerName,
          matchName,
          marketName,
          outcomeName,
          odds: oddValue,
        });
      });
    }
  }

  const unique = new Map<string, StarPlayerCardData>();
  rows.forEach((row) => {
    if (!unique.has(row.oddsId)) unique.set(row.oddsId, row);
  });

  return Array.from(unique.values())
    .sort((a, b) => {
      const aScore = (a.marketName.toLowerCase().includes("anytime goalscorer") ? -1 : 0) + a.odds;
      const bScore = (b.marketName.toLowerCase().includes("anytime goalscorer") ? -1 : 0) + b.odds;
      return aScore - bScore;
    })
    .slice(0, 20);
};

export const StarPlayers: FunctionComponent = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [players, setPlayers] = useState<StarPlayerCardData[]>([]);

  // Use native horizontal scrolling for the players carousel
  const scrollPrev = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: -distance, behavior: "smooth" });
  }, []);

  const scrollNext = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: distance, behavior: "smooth" });
  }, []);

  const sourceSignature = useMemo(() => {
    const storeKeys = Object.keys(storeState.value);
    const popularKeys = Object.keys(popularMatchesState.value);
    return `${storeKeys.length}|${popularKeys.length}`;
  }, [storeState.value, popularMatchesState.value]);

  useEffect(() => {
    const rebuild = () => {
      const next = buildStarPlayers(popularMatchesState.value, storeState.value);
      setPlayers(next);
    };
    rebuild();
    const intervalId = window.setInterval(rebuild, 2500);
    return () => window.clearInterval(intervalId);
  }, [sourceSignature]);

  const handleAddPlayerOdd = useCallback(
    (oddsId: string) => {
      const selected = players.find((p) => p.oddsId === oddsId);
      if (!selected) return;
      const event = storeState.value[selected.eventId]?.value;
      if (!event) return;
      const marketEntry = Object.entries(event.markets || {}).find(
        ([, mSig]) => {
          const m = (mSig as any)?.value;
          return !!m?.odds?.odds?.[selected.oddsId];
        },
      );
      if (!marketEntry) return;
      const [marketId, marketSig] = marketEntry as [string, any];
      const market = marketSig.value;
      const odd = market?.odds?.odds?.[selected.oddsId]?.value;
      handleClickOdd({
        oddId: selected.oddsId,
        oddName: formatOddName(odd?.name, event.participants),
        eventId: selected.eventId,
        marketId,
        marketName: market?.name || "Player Market",
        participants: event.participants,
        startDate: event.startDate,
        sportSlug: event.sport,
      });
    },
    [players],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex align-items w-full pt-4 pb-2 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt="Star Players"
          className="w-5 h-5"
        />
        <div className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold">
          Star Players
        </div>
      </div>

      <div className="players-carousel relative w-full">
        <div className="players-viewport" ref={viewportRef}>
          <div className="players-container">
            <HorizontalTabs>
              {players.map((player) => (
                <TopPlayerCard
                  key={player.oddsId}
                  data={player}
                  onAddToBetSlip={handleAddPlayerOdd}
                />
              ))}
            </HorizontalTabs>
          </div>
        </div>
      </div>
    </div>
  );
};
