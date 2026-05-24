import { FunctionComponent } from "preact";
import { useSignal } from "@preact/signals";
import { BetComponent } from "./BetComponent";
import { apiGetBetHistory } from "@/api/bet/betHistory";
import { isOpenBetsListStatus } from "@/helpers/showAcceptedBetInOpenBets";
import { useEffect, useRef, useState } from "preact/hooks";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import { getAppConfig } from "@/shared/config/appConfig";
import {
  betHistoryState,
  openBetsTabState,
  totalPagesState,
} from "@/state/betHistoryState";
import { playerSessionReady } from "@/state/betState";

export const OpenBets: FunctionComponent = () => {
  useSignal();
  const { t: tCommon } = useTranslate("common");
  const { t: tBetslip } = useTranslate("betslip");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const { xUserId } = getAppConfig();
  const selectedTab = openBetsTabState.value;
  const bets = betHistoryState.value;
  const sessionReady = playerSessionReady.value;

  const lastFetchedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!xUserId || !sessionReady) return;

    const fetchKey = `${xUserId}|${page}|${selectedTab}|${refreshToken}`;
    if (lastFetchedKeyRef.current === fetchKey) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiGetBetHistory({
          page,
          limit: 10,
          sort: "newest",
          tab: selectedTab,
        });

        if (cancelled) return;

        if (!response) {
          betHistoryState.value = [];
          totalPagesState.value = 1;
          return;
        }

        lastFetchedKeyRef.current = fetchKey;
        const apiBets = response.bets;
        if (selectedTab === "open" && page === 1) {
          const apiIds = new Set(apiBets.map((b) => b.betId));
          const localOnly = betHistoryState.value.filter(
            (b) => !apiIds.has(b.betId) && isOpenBetsListStatus(b.status),
          );
          betHistoryState.value = [...localOnly, ...apiBets];
        } else {
          betHistoryState.value = apiBets;
        }
        totalPagesState.value = response.totalPages;
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching bet history:", err);
        setError("An error occurred while fetching bet history");
        betHistoryState.value = [];
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [xUserId, sessionReady, page, selectedTab, refreshToken]);

  const handleTabChange = (tab: "open" | "settled") => {
    if (tab === selectedTab) return;
    lastFetchedKeyRef.current = "";
    betHistoryState.value = [];
    setPage(1);
    openBetsTabState.value = tab;
  };

  const handleCashoutSuccess = () => {
    lastFetchedKeyRef.current = "";
    setRefreshToken((n) => n + 1);
  };

  if (error) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-2">
        <span className="text-red-400 text-[14px]">{error}</span>
        <button
          onClick={() => {
            lastFetchedKeyRef.current = "";
            setRefreshToken((n) => n + 1);
          }}
          className={`px-4 py-2 bg-white/10 rounded-[4px]  text-[12px] transition-colors ${!isMobile.value ? "hover:bg-white/20" : ""}`}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] pb-30 md:pb-20 rounded-t-[16px] overflow-y-auto rounded-[4px] flex text-[12px] bg-[var(--sub-element-color)] text-[var(--text-basic-color)] flex-col gap-2 py-2">
      <div className="flex items-center justify-center w-full border-b-[1px] border-[var(--border-color)] py-4 uppercase">
        {tBetslip("mybets")}
      </div>
      <div className="relative mx-3 flex items-center gap-1 rounded-[90px] bg-[var(--sub-element-secondary)] p-1">
        <div
          className={`flex-1 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
            selectedTab === "open"
              ? "bg-white text-black border-b-[2px] border-[var(--primary-color)]"
              : !isMobile.value
                ? "hover:bg-white/20"
                : ""
          }`}
          onClick={() => handleTabChange("open")}
        >
          <span className="text-[12px] py-2 px-3">{tBetslip("Open")}</span>
        </div>
        <div
          className={`flex-1 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
            selectedTab === "settled"
              ? "bg-white text-black border-b-[2px] border-[var(--primary-color)]"
              : !isMobile.value
                ? "hover:bg-white/20"
                : ""
          }`}
          onClick={() => handleTabChange("settled")}
        >
          <span className="text-[12px] py-2 px-3">{tBetslip("Settled")}</span>
        </div>
      </div>

      {loading && (
        <div className="w-full min-h-[320px] flex items-center justify-center pt-4">
          <span className="text-[14px]">{tCommon("loadingBets")}</span>
        </div>
      )}

      {!loading && bets.length === 0 ? (
        <div className="w-full min-h-[320px] flex items-center justify-center pt-4">
          <span className="text-[14px]">
            {selectedTab === "open"
              ? tBetslip("noOpenBets")
              : tBetslip("noSettledBets")}
          </span>
        </div>
      ) : (
        !loading && (
          <div className="flex flex-col gap-2 pt-2">
            {bets.map((bet) => (
              <div
                key={bet.betId}
                className="w-full flex items-center justify-center px-2"
              >
                <BetComponent
                  bet={bet}
                  onCashoutSuccess={handleCashoutSuccess}
                  isSettledView={selectedTab === "settled"}
                />
              </div>
            ))}
          </div>
        )
      )}

      {!loading && totalPagesState.value > 1 && (
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
                    setPage(
                      Math.min(
                        Math.max(1, numericValue),
                        totalPagesState.value,
                      ),
                    );
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
