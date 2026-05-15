import { FunctionComponent } from "preact";
import { TopPlayerCard, StarPlayerCardData } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import "./style.scss";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import type {
  tEventModel,
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import type { Signal } from "@preact/signals";

// ---------------------------------------------------------------------------
// Star Players
// ---------------------------------------------------------------------------
// Each card carries 3 picks for the same event: a player market selection +
// a Match Result selection + a Total Goals Over/Under selection.
//
// Source events come from `storeState.value` directly (no `/popular`
// endpoint yet — same situation as TrendingAccas). Market detection is
// heuristic on `market.name` because `tMarketModel` no longer carries a
// `category` field. The bet-slip click is a no-op placeholder until the new
// selection-based click handler is exported from `Market.tsx`.
// ---------------------------------------------------------------------------

type StoreEventsMap = Record<number, Signal<tEventModel>>;

type StarPlayerPick = {
  oddsId: string;
  marketId: string;
  marketName: string;
  outcomeName: string;
  odds: number;
};

const MAX_CARDS = 20;
const REBUILD_INTERVAL_MS = 2500;

const PLAYER_MARKET_KEYWORDS = [
  "player",
  "goalscorer",
  "goal scorer",
  "to score",
  "shots",
  "assists",
  "to be booked",
  "cards",
];

const isActiveSelection = (sel: tSelectionValue | undefined): boolean => {
  if (!sel) return false;
  const price = Number(sel.price);
  return sel.status === 0 && Number.isFinite(price) && price > 1.01;
};

const isMatchResultMarket = (m: tMarketModel): boolean => {
  const n = String(m.name || "")
    .toLowerCase()
    .trim();
  return (
    n.includes("match result") ||
    n.includes("full time result") ||
    n === "1x2" ||
    n.includes("match winner") ||
    (n.includes("winner") && (n.includes("match") || n.includes("full")))
  );
};

const isTotalGoalsOverUnderMarket = (m: tMarketModel): boolean => {
  const n = String(m.name || "").toLowerCase();
  if (!n.includes("total")) return false;
  return (m.selections ?? []).some((sig) => {
    const sn = String(sig?.value?.name || "").toLowerCase();
    return sn.includes("over") || sn.includes("under");
  });
};

const isPlayerMarket = (m: tMarketModel): boolean => {
  const n = String(m.name || "").toLowerCase();
  return PLAYER_MARKET_KEYWORDS.some((kw) => n.includes(kw));
};

const findMatchResultPick = (event: tEventModel): StarPlayerPick | null => {
  for (const marketId of Object.keys(event.markets ?? {})) {
    const market = event.markets[marketId]?.value;
    if (!market || !isMatchResultMarket(market)) continue;
    for (const sig of market.selections ?? []) {
      const sel = sig?.value;
      if (!isActiveSelection(sel)) continue;
      return {
        oddsId: String(sel.id),
        marketId: String(market.id),
        marketName: market.name,
        outcomeName: sel.name,
        odds: Number(sel.price),
      };
    }
  }
  return null;
};

const findTotalGoalsPick = (event: tEventModel): StarPlayerPick | null => {
  for (const marketId of Object.keys(event.markets ?? {})) {
    const market = event.markets[marketId]?.value;
    if (!market || !isTotalGoalsOverUnderMarket(market)) continue;
    for (const sig of market.selections ?? []) {
      const sel = sig?.value;
      if (!isActiveSelection(sel)) continue;
      const sn = String(sel.name || "").toLowerCase();
      if (!sn.includes("over") && !sn.includes("under")) continue;
      return {
        oddsId: String(sel.id),
        marketId: String(market.id),
        marketName: market.name,
        outcomeName: sel.name,
        odds: Number(sel.price),
      };
    }
  }
  return null;
};

const GENERIC_SELECTION_TOKENS = new Set([
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
  "goalscorer",
  "goal scorer",
]);

const isLikelyPlayerName = (name: string): boolean => {
  const normalized = name.trim();
  if (!normalized) return false;
  if (normalized.length < 3) return false;
  const lower = normalized.toLowerCase();
  if (GENERIC_SELECTION_TOKENS.has(lower)) return false;
  if (/^no\s+goal[s]?core?r?$/i.test(normalized)) return false;
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(normalized);
};

const buildStarPlayers = (
  storeMap: StoreEventsMap,
): StarPlayerCardData[] => {
  const rows: StarPlayerCardData[] = [];

  for (const idStr of Object.keys(storeMap)) {
    const id = Number(idStr);
    if (!Number.isFinite(id)) continue;
    const event = storeMap[id]?.value;
    if (!event || !event.markets || !event.competitors?.length) continue;

    const matchResultPick = findMatchResultPick(event);
    const totalGoalsPick = findTotalGoalsPick(event);
    if (!matchResultPick || !totalGoalsPick) continue;

    const matchName = `${event.competitors[0]?.name || "Home"} - ${
      event.competitors[1]?.name || "Away"
    }`;

    for (const marketId of Object.keys(event.markets)) {
      const market = event.markets[marketId]?.value;
      if (!market || !isPlayerMarket(market)) continue;

      for (const sig of market.selections ?? []) {
        const sel = sig?.value;
        if (!isActiveSelection(sel)) continue;

        const playerName = String(sel.name || "").trim();
        if (!isLikelyPlayerName(playerName)) continue;

        rows.push({
          eventId: event.id,
          playerName,
          matchName,
          picks: [
            {
              oddsId: String(sel.id),
              marketId: String(market.id),
              marketName: market.name,
              outcomeName: playerName,
              odds: Number(sel.price),
            },
            matchResultPick,
            totalGoalsPick,
          ],
        });
      }
    }
  }

  // Dedupe by player selection id (each pick combo should appear once).
  const unique = new Map<string, StarPlayerCardData>();
  rows.forEach((row) => {
    const key = row.picks?.[0]?.oddsId;
    if (key && !unique.has(key)) unique.set(key, row);
  });

  return Array.from(unique.values())
    .sort((a, b) => {
      const aOdds = a.picks?.[0]?.odds ?? Number.POSITIVE_INFINITY;
      const bOdds = b.picks?.[0]?.odds ?? Number.POSITIVE_INFINITY;
      return aOdds - bOdds;
    })
    .slice(0, MAX_CARDS);
};

export const StarPlayers: FunctionComponent = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [players, setPlayers] = useState<StarPlayerCardData[]>([]);

  const sourceSignature = useMemo(() => {
    const keys = Object.keys(storeState.value);
    return `${keys.length}|${keys.slice(0, 50).join(",")}`;
  }, [storeState.value]);

  useEffect(() => {
    const rebuild = () => setPlayers(buildStarPlayers(storeState.value));
    rebuild();
    const intervalId = window.setInterval(rebuild, REBUILD_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [sourceSignature]);

  const handleAddPickToBetBuilder = useCallback(
    (_picks: { oddsId: string; marketId: string }[]) => {
      // TODO: wire to the new bet-slip click handler once it lands.
    },
    [],
  );

  if (players.length === 0) return null;

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
                  key={`${player.eventId}-${player.playerName}-${player.picks?.[0]?.marketId ?? "m"}-${player.picks?.[0]?.oddsId ?? "o"}`}
                  data={player}
                  onAddToBetSlip={handleAddPickToBetBuilder}
                />
              ))}
            </HorizontalTabs>
          </div>
        </div>
      </div>
    </div>
  );
};
