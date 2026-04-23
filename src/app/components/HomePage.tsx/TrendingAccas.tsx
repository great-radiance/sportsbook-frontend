import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import React from "react";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { popularMatchesState } from "@/state/popularMatchesState";
import { selectedOdds, selectedBetType } from "@/state/betState";
import { notify } from "@/shared/toast";
import { handleClickOdd } from "../MatchesBoard/components/Match/Market";

// Helper function to extract all available odds from a match
const extractAllOdds = (match: any) => {
  const oddsList: Array<{
    marketId: string;
    marketName: string;
    outcomeName: string;
    value: number;
    oddsId: string;
    participants: any;
  }> = [];

  if (!match.markets) return oddsList;

  Object.entries(match.markets).forEach(([marketId, market]: [string, any]) => {
    if (!market.value.odds?.odds) return;

    const marketName = market.value.name;
    const participants = match.participants;

    Object.entries(market.value.odds.odds).forEach(
      ([oddId, odd]: [string, any]) => {
        const oddStatus = (odd.value.status || "").toLowerCase();
        const oddValue = Number(odd.value.value);
        const isSelectableStatus =
          oddStatus === "nu" || oddStatus === "new" || oddStatus === "active";
        if (isSelectableStatus && Number.isFinite(oddValue) && oddValue > 0) {
          let outcomeName = "";

          // Extract outcome name based on market type
          if (odd.value.name?.e) {
            // Handle Match Result (1, 0, 2)
            if (odd.value.name.e === "1")
              outcomeName = `${participants[0]?.name || "Home"} Win`;
            else if (odd.value.name.e === "0") outcomeName = "Draw";
            else if (odd.value.name.e === "2")
              outcomeName = `${participants[1]?.name || "Away"} Win`;
            else if (odd.value.name.e === "yes")
              outcomeName = "Both Teams Score";
            else if (odd.value.name.e === "no")
              outcomeName = "Both Teams NOT Score";
            else if (odd.value.name.e === "over")
              outcomeName = `Over ${odd.value.name.h || ""}`;
            else if (odd.value.name.e === "under")
              outcomeName = `Under ${odd.value.name.h || ""}`;
            else outcomeName = odd.value.name.e;
          } else if (odd.value.name?.h) {
            outcomeName = odd.value.name.h;
          } else {
            outcomeName = "Unknown";
          }

          oddsList.push({
            marketId,
            marketName,
            outcomeName,
            value: oddValue,
            oddsId: oddId,
            participants,
          });
        }
      },
    );
  });

  return oddsList;
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

// Generate a random coupon from popularMatchesState (always 5 odds)
const generateRandomCoupon = (popularMatches: any, storeStateMap: any) => {
  // Extract all match IDs from popularMatchesState
  const matchIds: number[] = [];
  for (const sport of Object.keys(popularMatches)) {
    for (const region of Object.keys(popularMatches[sport] ?? {})) {
      for (const league of Object.keys(popularMatches[sport][region] ?? {})) {
        const ids = popularMatches[sport][region][league] ?? [];
        matchIds.push(...ids);
      }
    }
  }

  if (matchIds.length === 0) return [];

  // Get actual match data from storeState
  const uniqueMatchIds = Array.from(new Set(matchIds));
  const availableMatches = uniqueMatchIds
    .map((id) => storeStateMap[id])
    .filter((match) => match?.value);

  if (availableMatches.length === 0) return [];

  const numberOfSelections = 5; // Always 5 selections per coupon
  // Shuffle matches for random selection
  const shuffledMatches = [...availableMatches].sort(() => 0.5 - Math.random());
  const selectedBets: any[] = [];
  const usedMatchIds = new Set<number>();

  // Keep trying until we have exactly 5 selections
  for (const match of shuffledMatches) {
    if (selectedBets.length >= numberOfSelections) break;
    if (usedMatchIds.has(match.value.id)) continue;

    const allOdds = extractAllOdds(match.value);
    if (allOdds.length === 0) continue;

    // Randomly select an odd from available odds
    const randomOdd: any = allOdds[Math.floor(Math.random() * allOdds.length)];

    selectedBets.push({
      matchId: match.value.id,
      matchName: `${match.value.participants[0]?.name || "Home"} vs ${match.value.participants[1]?.name || "Away"}`,
      league: match.value.league,
      region: match.value.region,
      sport: match.value.sport,
      startDate: match.value.startDate,
      marketId: randomOdd.marketId,
      marketName: randomOdd.marketName,
      outcomeName: randomOdd.outcomeName,
      odds: randomOdd.value,
      oddsId: randomOdd.oddsId,
      participants: randomOdd.participants,
      date: formatDate(match.value.startDate),
    });
    usedMatchIds.add(match.value.id);
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
  // Generate 3 random coupons from popularMatchesState
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const lastSourceSignatureRef = React.useRef<string>("");

  const rebuildCoupons = React.useCallback(() => {
    const currentStore = storeState.value;
    const currentPopular = popularMatchesState.value;
    const hasData = Object.keys(currentStore).length > 0;
    const hasPopularMatches = Object.keys(currentPopular).length > 0;

    if (!hasData || !hasPopularMatches) return;

    const sourceSignature = `${Object.keys(currentPopular).length}|${Object.keys(currentStore).length}|${Object.keys(currentStore)
      .slice(0, 200)
      .map((id) => {
        const ev = currentStore[Number(id)]?.value;
        return `${id}:${ev?.status || ""}:${Object.keys(ev?.markets || {}).length}`;
      })
      .join(",")}`;

    if (sourceSignature === lastSourceSignatureRef.current && coupons.length > 0) {
      return;
    }

    const nextCoupons: any[] = [];
    let attempts = 0;
    while (nextCoupons.length < 3 && attempts < 40) {
      attempts += 1;
      const coupon = generateRandomCoupon(currentPopular, currentStore);
      if (coupon.length !== 5) continue;
      const signature = coupon.map((b) => b.oddsId).join("|");
      if (!nextCoupons.some((c) => c.map((b: any) => b.oddsId).join("|") === signature)) {
        nextCoupons.push(coupon);
      }
    }

    if (nextCoupons.length > 0) {
      setCoupons(nextCoupons);
      lastSourceSignatureRef.current = sourceSignature;
    }
  }, [coupons.length]);

  React.useEffect(() => {
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
                          src="/sportsicons/Soccer.png"
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
