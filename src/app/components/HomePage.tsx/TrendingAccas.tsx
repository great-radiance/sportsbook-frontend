import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import React from "react";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { popularMatchesState } from "@/state/popularMatchesState";

// Helper function to extract all available odds from a match
const extractAllOdds = (match: any) => {
  const oddsList: Array<{
    marketName: string;
    outcomeName: string;
    value: number;
    participants: any;
  }> = [];

  if (!match.markets) return oddsList;

  Object.values(match.markets).forEach((market: any) => {
    if (!market.value.odds?.odds) return;

    const marketName = market.value.name;
    const participants = match.participants;

    Object.values(market.value.odds.odds).forEach((odd: any) => {
      if (odd.value.status === "nu" && odd.value.value) {
        let outcomeName = "";

        // Extract outcome name based on market type
        if (odd.value.name?.e) {
          // Handle Match Result (1, 0, 2)
          if (odd.value.name.e === "1")
            outcomeName = `${participants[0]?.name || "Home"} Win`;
          else if (odd.value.name.e === "0") outcomeName = "Draw";
          else if (odd.value.name.e === "2")
            outcomeName = `${participants[1]?.name || "Away"} Win`;
          else if (odd.value.name.e === "yes") outcomeName = "Both Teams Score";
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
          marketName,
          outcomeName,
          value: odd.value.value,
          participants,
        });
      }
    });
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

// Generate a random coupon from popularMatchesState
const generateRandomCoupon = (popularMatches: any, storeState: any) => {
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
  const availableMatches = matchIds
    .map((id) => storeState[id])
    .filter((match) => match?.value);

  if (availableMatches.length === 0) return [];

  const numberOfSelections = 5; // 5 selections per coupon
  // Shuffle matches for random selection
  const shuffledMatches = [...availableMatches].sort(() => 0.5 - Math.random());
  const selectedBets: any[] = [];

  for (let i = 0; i < numberOfSelections && i < shuffledMatches.length; i++) {
    const match: any = shuffledMatches[i];
    const allOdds = extractAllOdds(match.value);
    if (allOdds.length === 0) continue;

    // Randomly select an odd from available odds
    const randomOdd: any = allOdds[Math.floor(Math.random() * allOdds.length)];
    console.log({
      matchId: match.value.id,
      matchName: `${match.value.participants[0]?.name || "Home"} vs ${match.value.participants[1]?.name || "Away"}`,
      league: match.value.league,
      region: match.value.region,
      marketName: randomOdd.marketName,
      outcomeName: randomOdd.outcomeName,
      odds: randomOdd.value,
      date: formatDate(match.value.startDate),
    });
    selectedBets.push({
      matchId: match.value.id,
      matchName: `${match.value.participants[0]?.name || "Home"} vs ${match.value.participants[1]?.name || "Away"}`,
      league: match.value.league,
      region: match.value.region,
      marketName: randomOdd.marketName,
      outcomeName: randomOdd.outcomeName,
      odds: randomOdd.value,
      date: formatDate(match.value.startDate),
    });
  }

  return selectedBets;
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

const TrendingAccas = () => {
  // Generate 3 random coupons from popularMatchesState
  // Load only once when storeState is initialized
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    // Only load once when storeState has data (is initialized)
    if (isInitialized) return;

    // Check if storeState has any data
    const hasData = Object.keys(storeState.value).length > 0;
    if (!hasData) return;

    setIsInitialized(true);

    const newCoupons = Array(3)
      .fill(null)
      .map(() =>
        generateRandomCoupon(popularMatchesState.value, storeState.value),
      )
      .filter((coupon) => coupon.length > 0);
    setCoupons(newCoupons);
  }, [isInitialized, storeState.value]);

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

                      {/* Odds */}
                      <div
                        className="px-3 py-1 rounded-md text-sm font-semibold shrink-0"
                        style={{
                          color: "var(--text-primary-color)",
                          backgroundColor: "var(--primary-soft-bg)",
                        }}
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
                    className="w-full py-2 rounded-md font-semibold text-sm"
                    style={{
                      backgroundColor: "var(--primary-strong-bg)",
                      color: "var(--text-basic-color)",
                    }}
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
