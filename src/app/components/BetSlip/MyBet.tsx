import { isOpenedMyBet } from "@/state/betState";
import { FunctionComponent } from "preact";
import { useRef, useEffect, useState } from "preact/hooks";
import { getAppConfig } from "@/shared/config/appConfig";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { notify } from "@/shared/toast";
import "./myBetStyle.scss";
import { Select, SelectItem } from "@/app/components/Select";
// import { apiGetBetHistory } from "@/api/bet/apiGetBetHistor";
import { betHistoryState } from "@/state/betHistoryState";
import { BetItemType } from "@/shared/utils/bet";
import { BetComponent } from "./BetComponent";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
export const MyBet: FunctionComponent = () => {
  const { t } = useTranslate("betslip");
  const { t: tCommon } = useTranslate("common");
  const myBetDialogRef = useRef<any>(null);
  const { xUserId, xUserName } = getAppConfig();
  const [selectedBetType, setSelectedBetType] = useState<string>("All");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("24 hours");
  const [allBets, setAllBets] = useState<BetItemType[]>([]);
  const [filteredBets, setFilteredBets] = useState<BetItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const betTypeOptions = [
    { value: "All", label: tCommon("all") },
    { value: "Single", label: t("single") },
    { value: "Multiple", label: t("multiple") },
    { value: "System", label: t("system") },
    { value: "Bet Builder", label: t("betBuilder") },
  ];

  const periodOptions = [
    { value: "1 hour", label: t("time1hour") },
    { value: "2 hours", label: t("time2hours") },
    { value: "3 hours", label: t("time3hours") },
    { value: "6 hours", label: t("time6hours") },
    { value: "12 hours", label: t("time12hours") },
    { value: "24 hours", label: t("time24hours") },
  ];

  // Fetch all bet history
  // const fetchAllBets = async (pageNum: number = 1, limit: number = 10) => {
  //   if (!xUserId) return;
  //   try {
  //     setLoading(true);
  //     const response = await apiGetBetHistory({
  //       page: pageNum,
  //       limit,
  //       sort: "newest",
  //     });
  //     if (response?.bets) {
  //       setAllBets(response.bets);
  //       setFilteredBets(response.bets);
  //       setTotalPages(response.totalPages || 1);
  //       setPage(response.page || pageNum);
  //     } else {
  //       setAllBets([]);
  //       setFilteredBets([]);
  //     }
  //   } catch (err) {
  //     console.error("Error fetching bet history:", err);
  //     notify("Failed to fetch bet history", "error", "x-circle", 2000);
  //     setAllBets([]);
  //     setFilteredBets([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Filter bets based on selected criteria
  const filterBets = (betType: string, period: string) => {
    let filtered = [...allBets];

    // Filter by bet type
    if (betType !== "All") {
      const typeMap: Record<string, string> = {
        Single: "single",
        Multiple: "multi",
        System: "system",
        "Bet Builder": "bet_builder",
      };
      const targetType = typeMap[betType];
      if (targetType) {
        filtered = filtered.filter((bet) => bet.betType === targetType);
      }
    }

    // Filter by period
    if (period !== "All") {
      const now = new Date().getTime();
      const periodHours = parseInt(
        period.replace(" hours", "").replace(" hour", ""),
      );
      const periodMs = periodHours * 60 * 60 * 1000;
      const cutoffTime = now - periodMs;

      filtered = filtered.filter((bet) => {
        const placedAt = new Date(bet.placedAt).getTime();
        return placedAt >= cutoffTime;
      });
    }
    setFilteredBets(filtered);
  };

  const handleShow = () => {
    filterBets(selectedBetType, selectedPeriod);
  };

  const dialogOpen = isOpenedMyBet.value;

  useEffect(() => {
    if (!dialogOpen || !xUserId) return;

    // Desktop sidebar already loads history in OpenBets — avoid a second list request.
    if (!isMobile.value && betHistoryState.value.length > 0) {
      setAllBets(betHistoryState.value);
      setFilteredBets(betHistoryState.value);
      return;
    }

    // void fetchAllBets(page);
  }, [dialogOpen, page, xUserId]);

  // Extract initials from username
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleCopyId = async () => {
    if (xUserId) {
      try {
        await navigator.clipboard.writeText(xUserId);
        notify("User ID copied to clipboard", "success", "check2-circle", 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        notify("Failed to copy user ID", "error", "x-circle", 2000);
      }
    }
  };

  useEffect(() => {
    const dialog = myBetDialogRef.current;
    if (!dialog) return;

    // Update dialog open state when signal changes
    if (isOpenedMyBet.value) {
      // dialog.show();
    } else {
      dialog.hide();
    }

    const handleRequestClose = () => {
      isOpenedMyBet.value = false;
    };

    const handleAfterHide = () => {
      isOpenedMyBet.value = false;
    };

    dialog.addEventListener("sl-request-close", handleRequestClose);
    dialog.addEventListener("sl-after-hide", handleAfterHide);

    return () => {
      dialog.removeEventListener("sl-request-close", handleRequestClose);
      dialog.removeEventListener("sl-after-hide", handleAfterHide);
    };
  }, [isOpenedMyBet.value]);

  return (
    <sl-dialog
      ref={myBetDialogRef}
      open={false}
      onSlRequestClose={() => (isOpenedMyBet.value = false)}
      onSlAfterHide={() => (isOpenedMyBet.value = false)}
      onSlClose={() => (isOpenedMyBet.value = false)}
      className="myBetDialog mx-auto my-auto flex flex-col overflow-hidden"
    >
      <div className="flex flex-col gap-2 w-full h-full overflow-hidden">
        <div className="w-full h-fit flex items-center bg-white/15 justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <span className="text-[14px] font-medium">
                {getInitials(xUserName || "")}
              </span>
            </div>

            {/* User Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[14px] font-normal truncate">
                {xUserName || ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-normal">{xUserId || ""}</span>
                <button
                  onClick={handleCopyId}
                  className={`flex items-center justify-center transition-opacity cursor-pointer ${!isMobile.value ? "hover:opacity-80" : ""}`}
                  title={t("copyUserId")}
                >
                  <img
                    src={`${BASE_ASSET_PUBLIC_URL}/icons/save.png`}
                    alt="copy"
                    className="w-3 h-3"
                  />
                </button>
              </div>
            </div>
          </div>
          <button
            className="flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
            onClick={() => (isOpenedMyBet.value = false)}
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/close.png`}
              alt={tCommon("close")}
              className="w-4"
            />
          </button>
        </div>
        <div className="w-full h-full p-4 flex flex-col gap-4 overflow-hidden">
          {/* Filter Controls */}
          <div className="w-full flex flex-col gap-3 bg-white/15 rounded-[4px] p-3">
            <div className="flex gap-3 w-full">
              {/* Bet Type Filter */}
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[11px] font-normal">Bet Type</label>
                <Select
                  value={selectedBetType}
                  onSelect={(value) => setSelectedBetType(value as string)}
                  className="w-full"
                  classNames={{
                    trigger: `w-full px-3 py-2 bg-white/10  text-[14px] rounded-[4px] border border-white/20 ${!isMobile.value ? "hover:bg-white/15" : ""}`,
                    panel:
                      "bg-[var(--background-color)] rounded-[4px] mt-1 border border-white/20",
                    item: `px-3 py-2 text-[14px]  ${!isMobile.value ? "hover:bg-white/10 hover:" : ""}`,
                  }}
                >
                  {betTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Period Filter */}
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[11px] font-normal">Period</label>
                <Select
                  value={selectedPeriod}
                  onSelect={(value) => setSelectedPeriod(value as string)}
                  className="w-full"
                  classNames={{
                    trigger: `w-full px-3 py-2 bg-white/10  text-[14px] rounded-[4px] border border-white/20 ${!isMobile.value ? "hover:bg-white/15" : ""}`,
                    panel:
                      "bg-[var(--background-color)] rounded-[4px] mt-1 border border-white/20",
                    item: `px-3 py-2 text-[14px]  ${!isMobile.value ? "hover:bg-white/10 hover:" : ""}`,
                  }}
                >
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {/* SHOW Button */}
            <div className="flex justify-end w-full">
              <button
                onClick={handleShow}
                className={`px-6 py-2 bg-[var(--primary-color)]  text-[14px] font-medium uppercase rounded-[4px] transition-opacity ${!isMobile.value ? "hover:opacity-90" : ""}`}
              >
                SHOW
              </button>
            </div>
          </div>

          {/* Bet History Content Area */}
          <div className="w-full flex-col rounded-[4px] overflow-y-auto py-2 scrollbar-none">
            {!isMobile.value && (
              <div className="w-full flex items-center bg-white/15 rounded-[4px] py-2 mb-1">
                <span className="w-[220px] px-2">{t("dateAndId")}</span>
                <span className="w-[120px] px-2">{t("betType")}</span>
                <span className="w-[100px] px-2">{t("stake")}</span>
                <span className="w-[100px] px-2">{t("odds")}</span>
                <span className="w-[140px] px-2">{t("outcome")}</span>
                <span className="w-[278px] px-2">{t("actions")}</span>
                <span className="w-[40px]"></span>
              </div>
            )}
            {loading ? (
              <div className="w-full h-full flex items-center justify-center py-8">
                <span className="text-[14px]">{t("loadingBetHistory")}</span>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center py-8">
                <span className="text-[14px]">{t("noBetsFound")}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                {filteredBets.map((bet) => (
                  <div key={bet.betId} className="w-full">
                    <BetComponent bet={bet} isMyBet={!isMobile.value} />
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
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
                  Previous
                </button>
                <span className="text-[12px]">
                  Page {page}
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
                  />
                  of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className={`px-4 py-2 rounded-[4px] text-[12px] transition-colors ${
                    page === totalPages
                      ? "bg-white/5  cursor-not-allowed"
                      : `bg-white/10  ${!isMobile.value ? "hover:bg-white/20" : ""}`
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </sl-dialog>
  );
};
