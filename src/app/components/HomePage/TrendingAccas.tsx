import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

import { HorizontalTabs } from "../HorizontalTabs";

import { useEffect, useState } from "preact/hooks";

import type { TrendingAccaCouponResponse } from "@/api/home/apiGetHomeWidget";

import {
  addSingleWidgetPickToSlip,
  addTrendingAccaToSlip,
} from "@/helpers/homeWidgetBetslip";

import { useSportsbookStore } from "@/state/sportsbookStoreContext";

import {
  widgetMarketDisplayName,
  widgetOutcomeDisplayName,
  widgetPickToSlipInput,
} from "@/helpers/widgetDisplayNames";

const formatKickoff = (iso: string) => {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const TrendingAccas = () => {
  const { homeWidgetsCache, baseColorTheme } = useSportsbookStore();
  const baseTheme = baseColorTheme.value;
  const [coupons, setCoupons] = useState<TrendingAccaCouponResponse[]>(
    homeWidgetsCache.value?.trendingAccas ?? [],
  );

  useEffect(() => {
    if (homeWidgetsCache.value) setCoupons(homeWidgetsCache.value.trendingAccas);

    return homeWidgetsCache.subscribe((value) => {
      if (value) setCoupons(value.trendingAccas);
    });
  }, []);

  if (coupons.length === 0) return null;

  return (
    <section>
      <div className="flex align-items w-full my-5 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt=""
          className="w-5 h-5"
        />

        <h2 className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold m-0">
          trending accas
        </h2>
      </div>

      <HorizontalTabs>
        {coupons.map((coupon) => (
          <article
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
                {coupon.combinedOdds.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col flex-1 justify-between bg-[var(--primary-soft-bg)]">
              <div className="flex flex-col flex-1 bg-[var(--sub-element-secondary)] rounded-t-xl overflow-hidden">
                {coupon.legs.map((leg, betIndex) => (
                  <div
                    key={`${leg.eventId}-${leg.selectionId}-${betIndex}`}
                    className="flex justify-between items-center p-3 border-b border-dashed last:border-none"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <div className="flex gap-2 min-w-0 flex-1">
                      <img
                        src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/${leg.sport.id}.svg`}
                        onError={(e) => {
                          e.currentTarget.src = `${BASE_ASSET_PUBLIC_URL}/stoiximan/sportIconsById/globe.svg`;
                        }}
                        alt=""
                        className={`w-4 h-4 mt-1 shrink-0 ${baseTheme === "dark" ? "invert" : ""}`}
                      />

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-[var(--text-basic-color)] break-words">
                          {widgetMarketDisplayName(leg)}:{" "}
                          {widgetOutcomeDisplayName(leg)}
                        </span>

                        <span className="text-xs text-[var(--text-sub-color)] break-words">
                          {leg.matchName}
                        </span>

                        <span className="text-[10px] text-[var(--text-sub-color)]">
                          {leg.region.name} · {leg.league.name} ·{" "}
                          {formatKickoff(leg.startTime)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-md text-sm font-semibold shrink-0 cursor-pointer hover:opacity-80"
                      style={{
                        color: "var(--text-primary-color)",

                        backgroundColor: "var(--primary-soft-bg)",
                      }}
                      onClick={() =>
                        void addSingleWidgetPickToSlip(
                          widgetPickToSlipInput(leg, leg),
                        )
                      }
                    >
                      {leg.odds.toFixed(2)}
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-col p-3 text-center border-t border-dashed"
                style={{ borderColor: "var(--border-color)" }}
              >
                {coupon.socialProof?.betCount ? (
                  <p className="text-xs text-[var(--text-sub-color)] mb-2 m-0">
                    {coupon.socialProof.betCount}+ bets on this
                  </p>
                ) : null}

                <button
                  type="button"
                  className="w-full py-2 rounded-md font-semibold text-sm cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: "var(--primary-strong-bg)",

                    color: "var(--text-basic-color)",
                  }}
                  onClick={() =>
                    void addTrendingAccaToSlip(
                      coupon.legs.map((leg) => widgetPickToSlipInput(leg, leg)),
                    )
                  }
                >
                  Add to betslip ·{" "}
                  <span style={{ color: "var(--primary-color)" }}>
                    {coupon.combinedOdds.toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </HorizontalTabs>
    </section>
  );
};

export default TrendingAccas;
