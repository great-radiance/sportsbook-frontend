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
import { popularMatchesState } from "@/state/popularMatchesState";
import { handleClickOdd } from "../MatchesBoard/components/Match/Market";
import { isBuilding } from "@/state/betState";
import { selectedOdds } from "@/state/betState";

const formatOddName = (
  oddName: any,
  participants: Array<{ name?: string }>,
): string => {
  const code = oddName?.e;
  const line = oddName?.h;

  // Match Result (1/X/2)
  if (code === "1") return `${participants[0]?.name || "Home"} Win`;
  if (code === "0") return "Draw";
  if (code === "2") return `${participants[1]?.name || "Away"} Win`;

  // Yes/No
  if (code === "yes") return "Yes";
  if (code === "no") return "No";

  // Over/Under style (e: over/under, h: line)
  if (
    (code === "over" || code === "under") &&
    (typeof line === "string" || typeof line === "number")
  ) {
    return `${code === "over" ? "Over" : "Under"} ${line}`;
  }

  if (typeof line === "string" || typeof line === "number") return String(line);
  if (!code) return "Selection";
  return String(code);
};

const extractPlayerNameFromOddNameE = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Non-player selections we don't want to treat as a player card.
  if (/^no\s+goalscorer$/i.test(trimmed)) return "";
  if (/^no\s+goal\s+scorer$/i.test(trimmed)) return "";

  // Remove common trailing qualifiers that sometimes appear in odd name `e`.
  // We keep this conservative because the feed may already send plain player names.
  const withoutQualifier = trimmed
    .replace(/\s*-\s*anytime\s+goalscorer\s*$/i, "")
    .replace(/\s+anytime\s+goalscorer\s*$/i, "")
    .replace(/\s+to\s+score\s*$/i, "")
    .replace(/\s+to\s+be\s+booked\s*$/i, "")
    .replace(/\s+shots\s+on\s+target\s*$/i, "")
    .replace(/\s+shots\s*$/i, "")
    .replace(/\s+assists?\s*$/i, "")
    .replace(/\s+cards?\s*$/i, "")
    .trim();

  // Feed sometimes sends player like "faye abdoulaye 2" (strip trailing number).
  const parts = withoutQualifier.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  const withoutTrailingNumber =
    last && /^\d+$/.test(last)
      ? parts.slice(0, -1).join(" ")
      : withoutQualifier;

  return withoutTrailingNumber.trim();
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
    "goalscorer",
    "goal scorer",
  ];
  const lower = normalized.toLowerCase();
  if (genericTokens.some((token) => lower.includes(token))) return false;

  // Must look like a person-style name: at least two parts and at least one letter.
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(normalized)) return false;
  return true;
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

type Pick = {
  oddsId: string;
  marketId: string;
  marketName: string;
  outcomeName: string;
  odds: number;
};

const isActiveOdd = (odd: any): boolean => {
  const st = String(odd?.status || "").toLowerCase();
  const v = Number(odd?.value);
  if (!Number.isFinite(v) || v <= 1.01) return false;
  return st === "nu" || st === "new" || st === "active";
};

const pickFromMarket = (
  event: any,
  marketId: string,
  market: any,
  options?: {
    preferEValues?: string[];
    outcomeNameBuilder?: (odd: any) => string;
  },
): Pick | null => {
  const oddsMap = market?.odds?.odds;
  if (!oddsMap) return null;

  const entries = Object.entries(oddsMap)
    .map(([oddId, oddSig]: [string, any]) => ({
      oddId,
      odd: oddSig?.value,
    }))
    .filter(({ odd }) => isActiveOdd(odd));

  if (!entries.length) return null;

  const findByE = (e: string) =>
    entries.find(({ odd }) => String(odd?.name?.e || "").toLowerCase() === e);

  const preferred =
    options?.preferEValues?.length && options.preferEValues.length > 0
      ? options.preferEValues
          .map((e) => findByE(String(e).toLowerCase()))
          .find(Boolean)
      : null;

  const chosen = preferred ?? entries[0];
  const chosenOdd = chosen?.odd;
  if (!chosenOdd) return null;

  const outcomeName = options?.outcomeNameBuilder
    ? options.outcomeNameBuilder(chosenOdd)
    : formatOddName(chosenOdd?.name, event.participants);

  return {
    oddsId: chosen.oddId,
    marketId: String(marketId),
    marketName: String(market?.name || ""),
    outcomeName,
    odds: Number(chosenOdd?.value),
  };
};

const marketHasOutcomeE = (market: any, eValue: string): boolean => {
  const oddsMap = market?.odds?.odds;
  if (!oddsMap) return false;
  const wanted = String(eValue).toLowerCase();
  return Object.values(oddsMap).some((oddSig: any) => {
    const odd = oddSig?.value;
    if (!isActiveOdd(odd)) return false;
    return String(odd?.name?.e || "").toLowerCase() === wanted;
  });
};

const findMatchResultPick = (event: any): Pick | null => {
  for (const [marketId, marketSig] of Object.entries(event?.markets ?? {})) {
    const market = (marketSig as any)?.value;
    if (!market?.odds?.odds) continue;

    // Detect 1/X/2 by outcome codes rather than market name.
    const has1 = marketHasOutcomeE(market, "1");
    const has0 = marketHasOutcomeE(market, "0");
    const has2 = marketHasOutcomeE(market, "2");
    if (!(has1 && has0 && has2)) continue;

    const pick =
      pickFromMarket(event, String(marketId), market, {
        preferEValues: ["1", "0", "2"],
      }) ?? null;
    if (pick) return pick;
  }
  return null;
};

const findTotalGoalsOverUnderPick = (event: any): Pick | null => {
  for (const [marketId, marketSig] of Object.entries(event?.markets ?? {})) {
    const market = (marketSig as any)?.value;
    if (!market?.odds?.odds) continue;

    // Detect O/U by outcome codes, and ensure we can render a sensible line.
    const hasOver = marketHasOutcomeE(market, "over");
    const hasUnder = marketHasOutcomeE(market, "under");
    if (!(hasOver && hasUnder)) continue;

    const pick =
      pickFromMarket(event, String(marketId), market, {
        preferEValues: ["over", "under"],
        outcomeNameBuilder: (odd) =>
          formatOddName(odd?.name, event.participants),
      }) ?? null;

    // Ensure it actually formatted into "Over X" / "Under X" (i.e., has a line).
    if (pick && /^(Over|Under)\s+/i.test(pick.outcomeName)) return pick;
  }
  return null;
};

const isPlayerMarketLike = (market: any): boolean => {
  const categoryRaw = market?.category;
  const category =
    typeof categoryRaw === "string" ? categoryRaw.toLowerCase() : "";
  if (category === "players" || category.includes("player")) return true;

  const nameRaw = market?.name;
  const name = typeof nameRaw === "string" ? nameRaw.toLowerCase() : "";
  if (
    name.includes("player") ||
    name.includes("goalscorer") ||
    name.includes("to score") ||
    name.includes("shots") ||
    name.includes("assists") ||
    name.includes("to be booked") ||
    name.includes("cards")
  ) {
    return true;
  }

  // Last resort: infer from odds labels looking like human names.
  const oddsMap = market?.odds?.odds;
  if (!oddsMap) return false;
  let scanned = 0;
  for (const oddSig of Object.values(oddsMap)) {
    const odd = (oddSig as any)?.value;
    if (!isActiveOdd(odd)) continue;
    const e = typeof odd?.name?.e === "string" ? odd.name.e.trim() : "";
    if (!e) continue;

    // Exclude common non-player codes.
    const lowerE = e.toLowerCase();
    if (
      lowerE === "1" ||
      lowerE === "0" ||
      lowerE === "2" ||
      lowerE === "over" ||
      lowerE === "under" ||
      lowerE === "yes" ||
      lowerE === "no"
    ) {
      continue;
    }

    const playerName = extractPlayerNameFromOddNameE(e);
    if (isLikelyPlayerName(playerName)) return true;

    scanned += 1;
    if (scanned >= 20) break;
  }

  return false;
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

    // 1) Pick a single Match Result and Total Goals O/U for the event.
    const matchResultPick = findMatchResultPick(event);
    const totalGoalsPick = findTotalGoalsOverUnderPick(event);

    if (!matchResultPick || !totalGoalsPick) continue;

    // 2) Build one Star Player card per valid player odd (category === "players").
    for (const [marketId, marketSig] of Object.entries(event.markets)) {
      const market = (marketSig as any)?.value;
      if (!market?.odds?.odds) continue;

      // If `market.category` is missing, infer based on market name / odds labels.
      if (!isPlayerMarketLike(market)) continue;

      const marketName = String(market?.name || "");

      for (const [oddId, oddSig] of Object.entries(market.odds.odds)) {
        const odd = (oddSig as any)?.value;
        if (!isActiveOdd(odd)) continue;

        // Only show a player card when the feed provides odd name as `{ e: "..." }`.
        // For player markets, `odd.name.e` is also the label we display for the outcome.
        const outcomeNameE =
          odd?.name &&
          typeof odd.name === "object" &&
          typeof odd.name.e === "string"
            ? odd.name.e.trim()
            : "";
        if (!outcomeNameE) continue;

        // Extract player name from `odd.name.e` (skip "no goalscorer" and similar).
        const playerName = extractPlayerNameFromOddNameE(outcomeNameE);
        if (!isLikelyPlayerName(playerName)) continue;

        const playerPick: Pick = {
          oddsId: String(oddId),
          marketId: String(marketId),
          marketName,
          outcomeName: outcomeNameE,
          odds: Number(odd?.value),
        };

        // Keep player pick first so existing card/button behavior stays consistent.
        rows.push({
          eventId: event.id,
          playerName,
          matchName,
          picks: [playerPick, matchResultPick, totalGoalsPick],
        });
      }
    }
  }

  const unique = new Map<string, StarPlayerCardData>();
  rows.forEach((row) => {
    const key = row.picks?.[0]?.oddsId;
    if (key && !unique.has(key)) unique.set(key, row);
  });

  return Array.from(unique.values())
    .sort((a, b) => {
      const aPlayerMarket = a.picks?.[0]?.marketName || "";
      const bPlayerMarket = b.picks?.[0]?.marketName || "";
      const aPlayerOdds = a.picks?.[0]?.odds || 999;
      const bPlayerOdds = b.picks?.[0]?.odds || 999;

      const aScore =
        (aPlayerMarket.toLowerCase().includes("anytime goalscorer") ? -1 : 0) +
        aPlayerOdds;
      const bScore =
        (bPlayerMarket.toLowerCase().includes("anytime goalscorer") ? -1 : 0) +
        bPlayerOdds;
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
      const next = buildStarPlayers(
        popularMatchesState.value,
        storeState.value,
      );
      setPlayers(next);
    };
    rebuild();
    const intervalId = window.setInterval(rebuild, 2500);
    return () => window.clearInterval(intervalId);
  }, [sourceSignature]);

  const handleAddPickToBetBuilder = useCallback(
    (picks: { oddsId: string; marketId: string }[]) => {
      const selected = players.find((p) =>
        p.picks?.some((x) => picks.some((p) => p.oddsId === x.oddsId)),
      );
      if (!selected) return;
      const event = storeState.value[selected.eventId]?.value;
      if (!event) return;

      const alreadySelected = (oddsId: string) =>
        (Array.isArray(selectedOdds.value) ? selectedOdds.value : []).some(
          (o) => o.oddsId === oddsId,
        );

      const prevBuilding = isBuilding.value;
      isBuilding.value = true;
      try {
        // Add ALL picks passed in one click (idempotent: don't toggle off)
        picks.forEach((p) => {
          if (alreadySelected(p.oddsId)) return;
          const market = event?.markets?.[p.marketId]?.value;
          const odd = market?.odds?.odds?.[p.oddsId]?.value;
          if (!market || !odd) return;

          handleClickOdd({
            oddId: p.oddsId,
            oddName: formatOddName(odd?.name, event.participants as any[]),
            eventId: selected.eventId,
            marketId: p.marketId,
            marketName: market?.name || "Market",
            participants: event.participants,
            startDate: event.startDate,
            sportSlug: event.sport,
          });
        });
      } finally {
        isBuilding.value = prevBuilding;
      }
    },
    [players],
  );

  // If there are no player markets available in popular matches, hide the whole section.
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
                  key={
                    player.picks?.[0]?.oddsId ||
                    `${player.eventId}-${player.playerName}`
                  }
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
