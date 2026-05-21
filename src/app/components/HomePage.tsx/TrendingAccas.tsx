import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { HorizontalTabs } from "../HorizontalTabs";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { TrendingAccaCouponResponse } from "@/api/home/homeWidgets";
import {
  addSingleWidgetPickToSlip,
  addTrendingAccaToSlip,
  type WidgetSelectionInput,
} from "@/helpers/homeWidgetBetslip";
import { useHomeWidgetPolling } from "@/hooks/useHomeWidgetPolling";
import {
  loadHomeWidgetsBatch,
  trendingAccasCache,
} from "@/state/homeWidgetsCache";
import { baseColorTheme } from "@/state/baseColorTheme";

const baseTheme = baseColorTheme.value;
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

function legToInput(
  leg: TrendingAccaCouponResponse["legs"][0],
): WidgetSelectionInput {
  return {
    eventId: leg.eventId,
    marketId: leg.marketId,
    selectionId: leg.selectionId,
    marketName: leg.marketName,
    outcomeName: leg.outcomeName,
    odds: leg.odds,
  };
}

const TrendingAccas = () => {
  const [coupons, setCoupons] = useState<TrendingAccaCouponResponse[]>([]);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      await loadHomeWidgetsBatch();
      if (!mountedRef.current) return;
      setCoupons(trendingAccasCache.value ?? []);
    } catch {
      if (!mountedRef.current) return;
      setCoupons([]);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = trendingAccasCache.subscribe((v) => {
      if (v && mountedRef.current) setCoupons(v);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  // useHomeWidgetPolling(load);

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
        {coupons.map((coupon) => {
          const totalOdds = coupon.combinedOdds;
          const betCount = coupon.socialProof?.betCount;

          return (
            <div
              key={coupon.couponId}
              className="flex flex-col w-[300px] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--background-element)]"
            >
              <div
                className="flex justify-between items-center px-4 py-1 bg-[var(--primary-soft-bg)]"
                style={{ borderColor: "var(--primary-color)" }}
              >
                <span className="font-semibold text-sm text-[var(--text-basic-color)]">
                  {coupon.foldCount}-Fold Combo
                </span>
                <span
                  className="px-3 py-1 rounded-md text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  {totalOdds.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col flex-1 justify-between bg-[var(--primary-soft-bg)]">
                <div className="flex flex-col flex-1 bg-[var(--sub-element-secondary)] rounded-t-xl overflow-hidden">
                  {coupon.legs.map((bet, betIndex) => (
                    <div
                      key={`${bet.eventId}-${bet.selectionId}-${betIndex}`}
                      className="flex justify-between items-center p-3 border-b border-dashed last:border-none"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="flex gap-2 min-w-0 flex-1">
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${bet.sport.id}.svg`}
                          onError={(e) => {
                            e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                          }}
                          alt="icon"
                          className={`w-4 h-4 mt-1 ${baseTheme === "dark" ? "invert" : ""}`}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold text-[var(--text-basic-color)] break-words whitespace-normal">
                            {bet.marketName}: {bet.outcomeName}
                          </span>
                          <span className="text-xs text-[var(--text-sub-color)] break-words whitespace-normal">
                            {bet.matchName}
                          </span>
                          <span className="text-[10px] text-[var(--text-sub-color)]">
                            {bet.region.name} - {bet.league.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-sub-color)]">
                            {formatDate(bet.startTime)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1 rounded-md text-sm font-semibold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          color: "var(--text-primary-color)",
                          backgroundColor: "var(--primary-soft-bg)",
                        }}
                        onClick={() =>
                          void addSingleWidgetPickToSlip(legToInput(bet))
                        }
                      >
                        {bet.odds.toFixed(2)}
                      </button>
                    </div>
                  ))}
                </div>

                <div
                  className="flex p-3 text-center border-t border-dashed"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  {typeof betCount === "number" && betCount > 0 && (
                    <div className="text-xs text-[var(--text-sub-color)] mb-2">
                      {betCount}+ bet on this
                    </div>
                  )}

                  <button
                    className="w-full py-2 rounded-md font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: "var(--primary-strong-bg)",
                      color: "var(--text-basic-color)",
                    }}
                    onClick={() =>
                      void addTrendingAccaToSlip(coupon.legs.map(legToInput))
                    }
                  >
                    ADD TO BETSLIP »{" "}
                    <span style={{ color: "var(--primary-color)" }}>
                      {totalOdds.toFixed(2)}
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
