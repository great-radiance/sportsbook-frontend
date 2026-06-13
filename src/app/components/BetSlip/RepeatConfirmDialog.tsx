/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "./repeatStyle.scss";
import { BetItemType } from "@/shared/utils/bet";
import { Market as MarketType, Odd as OddType } from "@/shared/utils/types";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import Loader from "../Loading/Loader";
import { notify } from "@/shared/toast";
import { useTranslate } from "@/shared/i18n/i18n";
// import { apiGetMatchData } from "@/api/fixtures/fixtures";

export const RepeatConfirmDialog: FunctionComponent = () => {
  const {
    isRepeatConfirmOpen,
    selectedRepeatBet,
    selectedBetslipTab,
  } = useSportsbookStore();
  const { t: tBetslip } = useTranslate("betslip");
  const { t: tCommon } = useTranslate("common");
  const dialogRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleRequestClose = () => {
      isRepeatConfirmOpen.value = false;
    };

    const handleAfterHide = () => {
      isRepeatConfirmOpen.value = false;
    };

    dialog.addEventListener("sl-request-close", handleRequestClose);
    dialog.addEventListener("sl-after-hide", handleAfterHide);

    return () => {
      dialog.removeEventListener("sl-request-close", handleRequestClose);
      dialog.removeEventListener("sl-after-hide", handleAfterHide);
    };
  }, []);

  const handleProceed = async () => {
    if (!selectedRepeatBet.value) {
      notify("Please select a bet to repeat", "error", "x-circle", 2500);
      return;
    }
    setIsLoading(true);
    const eventIds = selectedRepeatBet.value?.legs
      .map((leg) => leg.eventId)
      .join(",");
    selectedBetslipTab.value = "bet-slip";
    betSlipExpanded.value = true;
    isRepeatConfirmOpen.value = false;
    setIsLoading(false);
  };

  return (
    <>
      <sl-dialog
        ref={dialogRef}
        open={isRepeatConfirmOpen.value}
        onSlRequestClose={() => (isRepeatConfirmOpen.value = false)}
        onSlAfterHide={() => (isRepeatConfirmOpen.value = false)}
        onSlClose={() => (isRepeatConfirmOpen.value = false)}
        className="repeatConfirmDialog mx-auto my-auto rounded-[24px] flex flex-col"
      >
        <div className="px-4 gap-3 flex flex-col">
          <div className="flex w-full items-center justify-center pb-2">
            <h2 className="text-[16px] font-semibold uppercase">
              {tBetslip("confirmation")}
            </h2>
          </div>
          <h1 className="text-[14px] font-normal">
            {tBetslip("confirmClearMessage")}
          </h1>

          <button
            className={`relative w-full mt-2 rounded-[4px] h-[36px] items-center justify-center ${isLoading ? "bg-white/10" : "bg-[var(--primary-color)]"} text-black uppercase`}
            onClick={handleProceed}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-[4px] z-10">
                <Loader />
              </div>
            )}
            {tCommon("proceed")}
          </button>
          <button
            className={`w-full rounded-[4px] h-[36px] items-center justify-center border border-white/10  uppercase`}
            onClick={() => (isRepeatConfirmOpen.value = false)}
          >
            {tBetslip("cancel")}
          </button>
        </div>
      </sl-dialog>
    </>
  );
};
