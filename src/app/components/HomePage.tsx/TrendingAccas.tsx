import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { HorizontalTabs } from "../HorizontalTabs";
import { storeState } from "@/state/storeState";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type {
  tEventModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import type { Signal } from "@preact/signals";

// ---------------------------------------------------------------------------
// Trending Accas
// ---------------------------------------------------------------------------
// Renders 3 "5-fold" coupons made of Match Result / Match Winner picks
// (home or away — draws are skipped).
//
// The original implementation pulled candidate events from
// `popularMatchesState`, but that endpoint isn't available yet (see the
// preMatchPanel comment block). For now we source candidates directly from
// `storeState.value`, which is populated by whichever panel is rendered on
// the home page (preMatchPanel loads the first 10 events per sport on mount).
//
// The bet-slip click handler is a no-op until the new selection-based
// `handleClickOdd` lands in `MatchesBoard/components/Match/Market.tsx`.
// ---------------------------------------------------------------------------

type StoreEventsMap = Record<number, Signal<tEventModel>>;

type TrendingAccaBet = {
  matchId: number;
  matchName: string;
  league: string;
  region: string;
  sport: string;
  startTime: string;
  marketId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
  selectionId: number;
  date: string;
};

type TrendingCoupon = TrendingAccaBet[];

const COUPON_COUNT = 3;
const PICKS_PER_COUPON = 5;
const REBUILD_INTERVAL_MS = 2000;

/** Match Result / 1X2 / Match Winner — names vary by feed. */
const isMatchResultMarket = (name: string | undefined): boolean => {
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

/** Active = status 0 with a sensible price. Suspended (1) and closed (2/3) are skipped. */
const isActiveSelection = (sel: tSelectionValue | undefined): boolean => {
  if (!sel) return false;
  const price = Number(sel.price);
  return sel.status === 0 && Number.isFinite(price) && price > 1.01;
};

/** Heuristic: skip "Draw" so coupons stay home/away style. */
const looksLikeDraw = (name: string | undefined): boolean => {
  const n = String(name || "")
    .toLowerCase()
    .trim();
  return n === "draw" || n === "x" || n.includes("draw");
};

type MatchResultPick = {
  marketId: number;
  marketName: string;
  selectionId: number;
  outcomeName: string;
  price: number;
};

const extractMatchResultPicks = (event: tEventModel): MatchResultPick[] => {
  const picks: MatchResultPick[] = [];
  if (!event.markets) return picks;
  for (const marketId of Object.keys(event.markets)) {
    const market = event.markets[marketId]?.value;
    if (!market || !isMatchResultMarket(market.name)) continue;
    for (const sig of market.selections ?? []) {
      const sel = sig?.value;
      if (!isActiveSelection(sel)) continue;
      if (looksLikeDraw(sel.name)) continue;
      picks.push({
        marketId: market.id,
        marketName: market.name,
        selectionId: sel.id,
        outcomeName: sel.name,
        price: Number(sel.price),
      });
    }
  }
  return picks;
};

const formatDate = (iso: string) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Build one coupon of up to `PICKS_PER_COUPON` distinct Match-Result picks.
 * `couponIndex` seeds the home/away rotation so each coupon picks a
 * different selection from the same event.
 */
const generateCoupon = (
  storeStateMap: StoreEventsMap,
  couponIndex: number,
): TrendingCoupon => {
  const ids = Object.keys(storeStateMap)
    .map((k) => Number(k))
    .filter((id) => Number.isFinite(id) && !!storeStateMap[id]?.value?.markets)
    .sort((a, b) => {
      const tA = new Date(storeStateMap[a]?.value?.startTime ?? "").getTime();
      const tB = new Date(storeStateMap[b]?.value?.startTime ?? "").getTime();
      return (Number.isFinite(tA) ? tA : 0) - (Number.isFinite(tB) ? tB : 0);
    });

  const selected: TrendingAccaBet[] = [];
  const used = new Set<number>();

  for (const id of ids) {
    if (selected.length >= PICKS_PER_COUPON) break;
    const event = storeStateMap[id]?.value;
    if (!event || used.has(id)) continue;
    const picks = extractMatchResultPicks(event);
    if (!picks.length) continue;
    const pickIdx = (couponIndex + selected.length + id) % picks.length;
    const pick = picks[pickIdx];
    selected.push({
      matchId: event.id,
      matchName: `${event.competitors?.[0]?.name || "Home"} vs ${
        event.competitors?.[1]?.name || "Away"
      }`,
      league: event.league?.name || "",
      region: event.region?.name || "",
      sport: event.sport?.name || "",
      startTime: event.startTime,
      marketId: pick.marketId,
      marketName: pick.marketName,
      outcomeName: pick.outcomeName,
      odds: pick.price,
      selectionId: pick.selectionId,
      date: formatDate(event.startTime),
    });
    used.add(id);
  }

  return selected.length === PICKS_PER_COUPON ? selected : [];
};

const calculateTotalOdds = (coupon: TrendingAccaBet[]): number => {
  if (coupon.length === 0) return 0;
  return parseFloat(coupon.reduce((t, b) => t * b.odds, 1).toFixed(2));
};

const TrendingAccas = () => {
  const [coupons, setCoupons] = useState<TrendingCoupon[]>([]);
  const lastSignatureRef = useRef<string>("");

  const rebuild = useCallback(() => {
    const store = storeState.value;
    if (Object.keys(store).length === 0) return;

    // Cheap source-signature: keys + per-event market-count fingerprint.
    // Stops the rebuild loop from re-running when nothing has actually
    // changed (the interval below still fires every couple of seconds).
    const sig = Object.keys(store)
      .slice(0, 200)
      .map((id) => {
        const e = store[Number(id)]?.value;
        return `${id}:${Object.keys(e?.markets || {}).length}`;
      })
      .join(",");
    if (sig === lastSignatureRef.current && coupons.length > 0) return;

    const next: TrendingCoupon[] = [];
    for (
      let attempt = 0;
      attempt < COUPON_COUNT * 5 && next.length < COUPON_COUNT;
      attempt++
    ) {
      const c = generateCoupon(store, attempt);
      if (c.length !== PICKS_PER_COUPON) continue;
      const couponSig = c.map((b) => b.selectionId).join("|");
      if (
        !next.some((x) => x.map((b) => b.selectionId).join("|") === couponSig)
      ) {
        next.push(c);
      }
    }

    if (next.length > 0) {
      setCoupons(next);
      lastSignatureRef.current = sig;
    }
  }, [coupons.length]);

  useEffect(() => {
    rebuild();
    const intervalId = window.setInterval(rebuild, REBUILD_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [rebuild]);

  if (coupons.length === 0) return null;

  return (
    <div>
      <div className="flex align-items w-full my-5 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt="Trending Accas"
          className="w-5 h-5"
        />
        <div className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold">
          trending accas
        </div>
      </div>
      <HorizontalTabs>
        {coupons.map((coupon, couponIndex) => {
          const totalOdds = calculateTotalOdds(coupon);
          const betCount = Math.floor(Math.random() * 200) + 50;

          return (
            <div
              key={couponIndex}
              className="w-[300px] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--background-element)]"
            >
              <div
                className="flex justify-between items-center px-4 py-1 bg-[var(--primary-soft-bg)]"
                style={{ borderColor: "var(--primary-color)" }}
              >
                <span className="font-semibold text-sm text-[var(--text-basic-color)]">
                  {coupon.length}-Fold Combo
                </span>
                <span
                  className="px-3 py-1 rounded-md text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  {totalOdds}
                </span>
              </div>

              <div className="bg-[var(--primary-soft-bg)]">
                <div className="bg-[var(--sub-element-secondary)] rounded-t-xl overflow-hidden">
                  {coupon.map((bet, betIndex) => (
                    <div
                      key={`${bet.matchId}-${bet.selectionId}-${betIndex}`}
                      className="flex justify-between items-center p-3 border-b border-dashed last:border-none"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="flex gap-2 min-w-0 flex-1">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportsicons/${bet.sport}.png`}
                          alt="icon"
                          className="w-4 h-4 mt-1 brightness-0 invert"
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

                      <div
                        className="px-3 py-1 rounded-md text-sm font-semibold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          color: "var(--text-primary-color)",
                          backgroundColor: "var(--primary-soft-bg)",
                        }}
                        onClick={() => {
                          // TODO: wire single-pick add to the new bet-slip
                          // handler once `Market.tsx` re-exports a click
                          // handler against the selection model.
                        }}
                      >
                        {bet.odds}
                      </div>
                    </div>
                  ))}
                </div>

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
                    onClick={() => {
                      // TODO: wire multi-pick add to the new bet-slip handler.
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
