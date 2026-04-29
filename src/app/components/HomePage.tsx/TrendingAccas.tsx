import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { popularMatchesState } from "@/state/popularMatchesState";
import { selectedOdds, selectedBetType } from "@/state/betState";
import { notify } from "@/shared/toast";
import { handleClickOdd } from "../MatchesBoard/components/Match/Market";

import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/** Markets named like Match Result / Match Winner (not BTTS, totals, etc.). */
const isMatchResultOrWinnerMarketName = (name: string): boolean => {
  const n = String(name || "")
    .toLowerCase()
    .trim();
  if (!n) return false;
  return (
    n.includes("match result") ||
    n.includes("full time result") ||
    n === "1x2" ||
    n.includes("match winner") ||
    (n.includes("winner") &&
      (n.includes("match") || n.includes("full") || n.endsWith(" winner")))
  );
};

const isSelectableOddStatus = (odd: any): boolean => {
  const oddStatus = String(odd?.status || "").toLowerCase();
  const oddValue = Number(odd?.value);
  const ok =
    oddStatus === "nu" || oddStatus === "new" || oddStatus === "active";
  return ok && Number.isFinite(oddValue) && oddValue > 0;
};

const outcomeNameFor1x2 = (code: string, participants: any[]): string => {
  if (code === "1") return `${participants[0]?.name || "Home"} Win`;
  if (code === "0") return "Draw";
  if (code === "2") return `${participants[1]?.name || "Away"} Win`;
  return code;
};

type MatchResultOddRow = {
  marketId: string;
  marketName: string;
  outcomeName: string;
  value: number;
  oddsId: string;
  participants: any;
  outcomeCode: string;
};

/** Only Match Result / Match Winner: home/away only (`name.e` 1 or 2), never draw. */
const extractMatchResultOrWinnerOdds = (match: any): MatchResultOddRow[] => {
  const oddsList: MatchResultOddRow[] = [];
  if (!match?.markets) return oddsList;

  const participants = match.participants;

  Object.entries(match.markets).forEach(([marketId, market]: [string, any]) => {
    if (!market?.value?.odds?.odds) return;
    const marketName = String(market.value.name || "");
    if (!isMatchResultOrWinnerMarketName(marketName)) return;

    Object.entries(market.value.odds.odds).forEach(
      ([oddId, odd]: [string, any]) => {
        const ov = odd?.value;
        if (!isSelectableOddStatus(ov)) return;

        const code = String(ov?.name?.e ?? "").toLowerCase();
        if (code !== "1" && code !== "2") return;

        oddsList.push({
          marketId,
          marketName,
          outcomeName: outcomeNameFor1x2(code, participants),
          value: Number(ov.value),
          oddsId: oddId,
          participants,
          outcomeCode: code,
        });
      },
    );
  });

  return oddsList;
};

/** Pick home or away only (no draw); deterministic preference order. */
const pickMatchResultOdd = (
  odds: MatchResultOddRow[],
  preferenceSeed: number,
): MatchResultOddRow | null => {
  const homeAway = odds.filter(
    (o) => o.outcomeCode === "1" || o.outcomeCode === "2",
  );
  if (!homeAway.length) return null;
  const rotations = [
    ["1", "2"],
    ["2", "1"],
  ] as const;
  const pref = rotations[Math.abs(preferenceSeed) % rotations.length];
  for (const code of pref) {
    const found = homeAway.find((o) => o.outcomeCode === code);
    if (found) return found;
  }
  return homeAway[0];
};

// Format date from timestamp
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const getPopularMatchIdsOrdered = (popularMatches: any): number[] => {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const sport of Object.keys(popularMatches ?? {})) {
    for (const region of Object.keys(popularMatches[sport] ?? {})) {
      for (const league of Object.keys(popularMatches[sport][region] ?? {})) {
        for (const rawId of popularMatches[sport][region][league] ?? []) {
          const id = Number(rawId);
          if (!Number.isFinite(id) || seen.has(id)) continue;
          seen.add(id);
          ids.push(id);
        }
      }
    }
  }
  return ids;
};

/** Match Result / Match Winner only: popular matches first, then other events from the store. */
const generateTrendingCoupon = (
  popularMatches: any,
  storeStateMap: any,
  couponIndex: number,
) => {
  const popularIdsOrdered = getPopularMatchIdsOrdered(popularMatches);
  const popularSet = new Set(popularIdsOrdered);

  const wrapEntry = (match: any, preferenceSeed: number) => {
    const mrOdds = extractMatchResultOrWinnerOdds(match);
    const odd = pickMatchResultOdd(mrOdds, preferenceSeed);
    if (!odd) return null;
    return {
      matchId: match.id,
      matchName: `${match.participants[0]?.name || "Home"} vs ${match.participants[1]?.name || "Away"}`,
      league: match.league,
      region: match.region,
      sport: match.sport,
      startDate: match.startDate,
      marketId: odd.marketId,
      marketName: odd.marketName,
      outcomeName: odd.outcomeName,
      odds: odd.value,
      oddsId: odd.oddsId,
      participants: odd.participants,
      date: formatDate(match.startDate),
    };
  };

  const numberOfSelections = 5;
  const selectedBets: any[] = [];
  const usedMatchIds = new Set<number>();

  const tryConsumeMatch = (match: any | undefined, slotIndex: number) => {
    if (!match?.id || usedMatchIds.has(match.id)) return false;
    const pref = couponIndex * numberOfSelections + slotIndex + match.id;
    const bet = wrapEntry(match, pref);
    if (!bet) return false;
    selectedBets.push(bet);
    usedMatchIds.add(match.id);
    return true;
  };

  // 1) Popular matches first (preserve sidebar order), one MR/MW odd per event.
  for (const id of popularIdsOrdered) {
    if (selectedBets.length >= numberOfSelections) break;
    const entry = storeStateMap[id];
    const match = entry?.value;
    tryConsumeMatch(match, selectedBets.length);
  }

  // 2) Fill from other events in the store (sorted by start date).
  if (selectedBets.length < numberOfSelections) {
    const otherIds = Object.keys(storeStateMap ?? {})
      .map((k) => Number(k))
      .filter(
        (id) =>
          Number.isFinite(id) &&
          !popularSet.has(id) &&
          storeStateMap[id]?.value?.markets,
      )
      .sort(
        (a, b) =>
          (storeStateMap[a]?.value?.startDate ?? 0) -
          (storeStateMap[b]?.value?.startDate ?? 0),
      );

    for (const id of otherIds) {
      if (selectedBets.length >= numberOfSelections) break;
      const match = storeStateMap[id]?.value;
      tryConsumeMatch(match, selectedBets.length);
    }
  }

  return selectedBets.length === numberOfSelections ? selectedBets : [];
};

// Calculate total odds for a coupon
const calculateTotalOdds = (coupon: any[]) => {
  if (coupon.length === 0) return 0;
  return parseFloat(
    coupon.reduce((total, bet) => total * bet.odds, 1).toFixed(2),
  );
};

// Get random bet count display text
const getBetCountText = (count: number) => {
  return `${count}-Fold Combo`;
};

// Generate random bet count for footer
const getRandomBetCount = () => {
  return Math.floor(Math.random() * 200) + 50;
};

// Add a single odd to the bet slip
const addSingleOddToBetSlip = (bet: any) => {
  selectedBetType.value = "single";
  handleClickOdd({
    oddId: bet.oddsId,
    oddName: bet.outcomeName,
    eventId: bet.matchId,
    marketId: bet.marketId,
    marketName: bet.marketName,
    participants: bet.participants,
    startDate: bet.startDate,
    sportSlug: bet.sport,
  });
};

// Add all coupon odds to bet slip as multi bet
const addCouponToBetSlip = (coupon: any[]) => {
  if (coupon.length === 0) return;
  if (coupon.length !== 5) {
    notify("Combo must contain exactly 5 odds", "warning");
    return;
  }

  const newOdds = coupon.map((bet) => ({
    sport: bet.sport,
    region: bet.region,
    league: bet.league,
    oddsId: bet.oddsId,
    name: bet.outcomeName,
    marketId: bet.marketId,
    eventId: bet.matchId,
    sportSlug: bet.sport,
    marketName: bet.marketName,
    participants: bet.participants,
    startDate: bet.startDate,
    isBuilding: false,
    selectedBank: false,
    amount: 0,
  }));

  selectedOdds.value = newOdds;
  selectedBetType.value = "multi";
  notify("Added to bet slip", "success");
};

const TrendingAccas = () => {
  // Generate 3 trending coupons (Match Result / Match Winner only)
  const [coupons, setCoupons] = useState<any[]>([]);
  const lastSourceSignatureRef = useRef<string>("");

  const rebuildCoupons = useCallback(() => {
    const currentStore = storeState.value;
    const currentPopular = popularMatchesState.value;
    const hasData = Object.keys(currentStore).length > 0;
    const hasPopularMatches = Object.keys(currentPopular).length > 0;

    if (!hasData || !hasPopularMatches) return;

    const sourceSignature = `${Object.keys(currentPopular).length}|${Object.keys(currentStore).length}|${Object.keys(
      currentStore,
    )
      .slice(0, 200)
      .map((id) => {
        const ev = currentStore[Number(id)]?.value;
        return `${id}:${ev?.status || ""}:${Object.keys(ev?.markets || {}).length}`;
      })
      .join(",")}`;

    if (
      sourceSignature === lastSourceSignatureRef.current &&
      coupons.length > 0
    ) {
      return;
    }

    const nextCoupons: any[] = [];
    let attempts = 0;
    while (nextCoupons.length < 3 && attempts < 40) {
      attempts += 1;
      const coupon = generateTrendingCoupon(
        currentPopular,
        currentStore,
        nextCoupons.length,
      );
      if (coupon.length !== 5) continue;
      const signature = coupon.map((b) => b.oddsId).join("|");
      if (
        !nextCoupons.some(
          (c) => c.map((b: any) => b.oddsId).join("|") === signature,
        )
      ) {
        nextCoupons.push(coupon);
      }
    }

    if (nextCoupons.length > 0) {
      setCoupons(nextCoupons);
      lastSourceSignatureRef.current = sourceSignature;
    }
  }, [coupons.length]);

  useEffect(() => {
    rebuildCoupons();
    const intervalId = window.setInterval(rebuildCoupons, 2000);
    return () => window.clearInterval(intervalId);
  }, [rebuildCoupons]);

  if (coupons.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex align-items w-full my-5 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt="Star Players"
          className="w-5 h-5"
        />
        <div className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold">
          trending accas
        </div>
      </div>
      <HorizontalTabs>
        {coupons.map((coupon, couponIndex) => {
          const totalOdds = calculateTotalOdds(coupon);
          const totalBets = coupon.length;
          const betCount = getRandomBetCount();

          return (
            <div
              key={couponIndex}
              className="w-[300px] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--background-element)]"
            >
              {/* Header */}
              <div
                className="flex justify-between items-center px-4 py-1 bg-[var(--primary-soft-bg)]"
                style={{ borderColor: "var(--primary-color)" }}
              >
                <span className="font-semibold text-sm text-[var(--text-basic-color)]">
                  {getBetCountText(totalBets)}
                </span>

                <span
                  className="px-3 py-1 rounded-md text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  {totalOdds}
                </span>
              </div>

              {/* Wrapper to show rounded top */}
              <div className="bg-[var(--primary-soft-bg)]">
                {/* List */}
                <div className="bg-[var(--sub-element-secondary)] rounded-t-xl overflow-hidden">
                  {coupon.map((bet: any, betIndex: any) => (
                    <div
                      key={betIndex}
                      className="flex justify-between items-center p-3 border-b border-dashed last:border-none"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      {/* Left */}
                      <div className="flex gap-2 min-w-0 flex-1">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/sportsicons/${bet.sport}.png`}
                          alt="icon"
                          className="w-4 h-4 mt-1"
                        />

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold text-[var(--text-basic-color)] break-words whitespace-normal">
                            {bet.marketName}: {bet.outcomeName}
                          </span>
                          <span className="text-xs text-[var(--text-sub-color)] break-words whitespace-normal">
                            {bet.matchName}
                          </span>
                          <span className="text-[10px] text-[var(--text-sub-color)]">
                            {bet.region} - {bet.league}
                          </span>
                          <span className="text-[10px] text-[var(--text-sub-color)]">
                            {bet.date}
                          </span>
                        </div>
                      </div>

                      {/* Odds - Clickable */}
                      <div
                        className="px-3 py-1 rounded-md text-sm font-semibold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          color: "var(--text-primary-color)",
                          backgroundColor: "var(--primary-soft-bg)",
                        }}
                        onClick={() => addSingleOddToBetSlip(bet)}
                      >
                        {bet.odds}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div
                  className="p-3 text-center border-t border-dashed"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="text-xs text-[var(--text-sub-color)] mb-2">
                    🔥 {betCount}+ bet on this
                  </div>

                  <button
                    className="w-full py-2 rounded-md font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: "var(--primary-strong-bg)",
                      color: "var(--text-basic-color)",
                    }}
                    onClick={() => addCouponToBetSlip(coupon)}
                  >
                    ADD TO BETSLIP »{" "}
                    <span style={{ color: "var(--primary-color)" }}>
                      {totalOdds}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </HorizontalTabs>
    </div>
  );
};

export default TrendingAccas;
