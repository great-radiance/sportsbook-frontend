import { FunctionComponent } from "preact";
import { BetComponent } from "./BetComponent";
import { apiGetBetHistory } from "@/api/bet/betHistory";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import { getAppConfig } from "@/shared/config/appConfig";
import {
  betHistoryState,
  cashOutOfferState,
  currentPageState,
  totalPagesState,
} from "@/state/betHistoryState";
import { loadedAllMatches } from "@/state/loadedAllMatches";
import { getTranslate } from "@/helpers/getTranslate";

export const OpenBets: FunctionComponent = () => {
  const { t: tCommon } = useTranslate("common");
  const { t: tBetslip } = useTranslate("betslip");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const { xUserId } = getAppConfig();
  const [selectedTab, setSelectedTab] = useState<"open" | "settled">("open");

  const lastRequestKeyRef = useRef<string>("");

  const fetchPendingBets = useCallback(async () => {
    if (!xUserId || !page || !selectedTab || !loadedAllMatches.value) return;

    const status =
      selectedTab === "open"
        ? ["pending", "partially_cashed_out"].join(",")
        : ["cashed_out"].join(",");

    const requestKey = `${xUserId}|${page}|${status}`;

    // prevents duplicate fetches (including StrictMode double-invoke)
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;

    try {
      setLoading(true);
      setError(null);

      const response = await apiGetBetHistory({
        page,
        limit: 10,
        status,
        userId: xUserId,
      });

      betHistoryState.value = response?.bets || [];
      totalPagesState.value = response?.totalPages || 1;
    } catch (err) {
      console.error("Error fetching pending bets:", err);
      setError("An error occurred while fetching pending bets");
      betHistoryState.value = [];
    } finally {
      setLoading(false);
    }
  }, [xUserId, selectedTab, page, loadedAllMatches.value]);

  const fetchAfterCashout = useCallback(async () => {
    if (!xUserId || !page || !selectedTab || !loadedAllMatches.value) return;

    const status =
      selectedTab === "open"
        ? ["pending", "partially_cashed_out"].join(",")
        : ["cashed_out"].join(",");

    try {
      setLoading(true);
      setError(null);

      const response = await apiGetBetHistory({
        page,
        limit: 10,
        status,
        userId: xUserId,
      });

      betHistoryState.value = response?.bets || [];
      totalPagesState.value = response?.totalPages || 1;
      console.log("openBets", getAppConfig().lang);
    } catch (err) {
      console.error("Error fetching pending bets:", err);
      setError("An error occurred while fetching pending bets");
      betHistoryState.value = [];
    } finally {
      setLoading(false);
    }
  }, [xUserId, selectedTab, page]);

  useEffect(() => {
    if (getAppConfig().lang !== "en") {
      const sourceTexts = new Set<string>();
      for (const bet of betHistoryState.value) {
        if (bet.legs?.length) {
          for (const leg of bet.legs) {
            if (leg.league?.name) sourceTexts.add(leg.league.name);
            if (leg.market?.name) sourceTexts.add(leg.market.name);

            leg.participants?.forEach((p) => {
              if (p?.name) sourceTexts.add(p.name);
            });
            leg.odds?.forEach((o) => {
              if (o?.name) sourceTexts.add(o.name);
            });
          }
        }
      }
      if (sourceTexts.size) getTranslate([...sourceTexts]);
    }
  }, [betHistoryState.value]);

  useEffect(() => {
    fetchPendingBets();
  }, [fetchPendingBets]);

  if (error) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-2">
        <span className="text-red-400 text-[14px]">{error}</span>
        <button
          onClick={() => fetchPendingBets()}
          className={`px-4 py-2 bg-white/10 rounded-[4px]  text-[12px] transition-colors ${!isMobile.value ? "hover:bg-white/20" : ""}`}
        >
          Retry
        </button>
      </div>
    );
  }

  // if (pendingBets.length === 0) {
  //   return (
  //     <div className="w-full min-h-[400px] flex items-center justify-center">
  //       <span className="text-[14px]">You have no open bets at the moment</span>
  //     </div>
  //   );
  // }

  const handleCashoutSuccess = () => {
    // Refresh the list after successful cashout
    fetchAfterCashout();
  };

  return (
    <div className="w-full min-h-[400px] pb-30 md:pb-20 rounded-t-[16px] overflow-y-auto rounded-[4px] flex text-[12px] bg-[var(--sub-element-color)] text-[var(--text-basic-color)] flex-col gap-2 py-2">
      <div className="flex items-center justify-center w-full border-b-[1px] border-[var(--border-color)]  py-4 uppercase">
        {tBetslip("mybets")}
      </div>
      {/* tablist */}
      <div className="bg-[var(--sub-element-secondary)] rounded-[90px] left-3 right-3 absolute flex items-center gap-1 p-1">
        {/* OPEN TAB */}
        <div
          className={`flex-1 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
            selectedTab === "open"
              ? "bg-white text-black border-b-[2px] border-[var(--primary-color)]"
              : !isMobile.value
                ? "hover:bg-white/20"
                : ""
          }`}
          onClick={() => setSelectedTab("open")}
        >
          <span className="text-[12px] py-2 px-3">{tBetslip("Open")}</span>
        </div>

        {/* SETTLED TAB */}
        <div
          className={`flex-1 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
            selectedTab === "settled"
              ? "bg-white text-black border-b-[2px] border-[var(--primary-color)]"
              : !isMobile.value
                ? "hover:bg-white/20"
                : ""
          }`}
          onClick={() => setSelectedTab("settled")}
        >
          <span className="text-[12px] py-2 px-3">{tBetslip("Settled")}</span>
        </div>
      </div>
      {loading && (
        <div className="w-full min-h-[400px] flex items-center justify-center">
          <span className="text-[14px]">{tCommon("loadingBets")}</span>
        </div>
      )}

      {!loading && betHistoryState.value.length === 0 ? (
        <div className="w-full min-h-[400px] flex items-center justify-center">
          <span className="text-[14px]">{tBetslip("noOpenBets")}</span>
        </div>
      ) : (
        betHistoryState.value.map((bet) => {
          if (
            cashOutOfferState.value[bet.betId]?.canCashout === false &&
            selectedTab === "open"
          ) {
            return null;
          }
          return (
            <div
              key={bet.betId}
              className="w-full flex items-center justify-center px-2"
            >
              <BetComponent bet={bet} onCashoutSuccess={handleCashoutSuccess} />
            </div>
          );
        })
      )}

      {/* Pagination */}
      {totalPagesState.value > 1 && (
        <div className="w-full flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-[4px] text-[12px] transition-colors ${
              page === 1
                ? "bg-white/5  cursor-not-allowed"
                : `bg-white/10  ${!isMobile.value ? "hover:bg-white/20" : ""}`
            }`}
          >
            {tBetslip("paginationPrevious")}
          </button>
          <span className="text-[12px]">
            {tBetslip("paginationPage")}{" "}
            <input
              type="number"
              value={page}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value;
                  const numericValue = value === "" ? 1 : Number(value);
                  if (!isNaN(numericValue)) {
                    setPage(numericValue);
                  }
                }
              }}
              className="mx-2 w-12 text-center bg-transparent border-b border-white/30 focus:outline-none"
            />{" "}
            {tBetslip("paginationOf")} {totalPagesState.value}
          </span>
          <button
            onClick={() =>
              setPage((prev) => Math.min(totalPagesState.value, prev + 1))
            }
            disabled={page === totalPagesState.value}
            className={`px-4 py-2 rounded-[4px] text-[12px] transition-colors ${
              page === totalPagesState.value
                ? "bg-white/5  cursor-not-allowed"
                : `bg-white/10  ${!isMobile.value ? "hover:bg-white/20" : ""}`
            }`}
          >
            {tBetslip("paginationNext")}
          </button>
        </div>
      )}
    </div>
  );
};
