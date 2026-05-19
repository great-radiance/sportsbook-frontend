/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "preact/hooks";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "./cashout-dialog.css";
import {
  cashoutDialogOnSuccess,
  isOpenedCashoutDialog,
} from "@/state/isOpenedCashoutDialog";
import {
  selectedCashoutAmount,
  selectedCashoutBet,
  selectedCashoutBetId,
} from "@/state/betState";
import { fullCashout } from "@/api/bet/cashout";
import { isCashoutableStatus } from "@/helpers/betStatus";
import { refreshAfterWalletAction } from "@/helpers/refreshPlayerWallet";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/shared/utils/formatters";
import { notify } from "@/shared/toast";
import { useTranslate } from "@/shared/i18n/i18n";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import type { BetItemType, BetLegType } from "@/shared/utils/bet";

/** Clear global cashout dialog state only (never call `hide()` here). */
function clearCashoutDialogSignals() {
  isOpenedCashoutDialog.value = false;
  selectedCashoutBetId.value = null;
  selectedCashoutBet.value = null;
  selectedCashoutAmount.value = 0;
  cashoutDialogOnSuccess.value = null;
}

function selectedOddForLeg(leg: BetLegType) {
  return leg.odds.find((o) => o.selected) ?? leg.odds[0];
}

function participantLine(leg: BetLegType): string {
  const a =
    leg.participants[0]?.name || leg.participants[0]?.providerName || "";
  const b =
    leg.participants[1]?.name || leg.participants[1]?.providerName || "";
  if (a && b) return `${a} — ${b}`;
  return a || b || "—";
}

const MAX_LEGS_IN_DIALOG = 6;

const InfoRow: FunctionComponent<{
  label: string;
  value: string | number;
  emphasize?: boolean;
}> = ({ label, value, emphasize }) => (
  <div className="flex items-start justify-between gap-3 py-2 text-[13px] border-b border-[var(--border-color)]/50 last:border-b-0">
    <span className="text-[var(--text-sub-color)] shrink-0">{label}</span>
    <span
      className={`min-w-0 text-right break-words ${emphasize ? "font-semibold tabular-nums text-[var(--primary-color)]" : "text-[var(--text-basic-color)]"}`}
    >
      {value}
    </span>
  </div>
);

export const CashoutDialog: FunctionComponent = () => {
  const { t } = useTranslate("betslip");
  const { t: tCommon } = useTranslate("common");
  const dialogRef = useRef<
    (HTMLElement & { show: () => void; hide: () => void }) | null
  >(null);
  const [processing, setProcessing] = useState(false);

  const betId = selectedCashoutBetId.value;
  const bet: BetItemType | null = selectedCashoutBet.value;
  const available = selectedCashoutAmount.value;
  const canAct = Boolean(bet && isCashoutableStatus(bet.status) && available > 0);
  const possibleWin = bet ? bet.stakeAmount * bet.startingOdds : 0;

  const shortBetId = bet
    ? bet.betId.split("_")[1] || bet.betId
    : betId?.split("_")[1] || betId || "—";

  const displayLegs = useMemo(() => {
    if (!bet?.legs?.length) return [];
    return bet.legs.slice(0, MAX_LEGS_IN_DIALOG);
  }, [bet]);

  const moreLegsCount = bet?.legs
    ? Math.max(0, bet.legs.length - MAX_LEGS_IN_DIALOG)
    : 0;

  const closeDialog = useCallback(() => {
    clearCashoutDialogSignals();
    dialogRef.current?.hide();
  }, []);

  const handleManualCashout = async () => {
    if (!betId || !bet || !canAct) {
      notify(
        "Cashout is not available for this bet",
        "error",
        "x-circle",
        2500,
      );
      return;
    }

    setProcessing(true);
    try {
      const response = await fullCashout(betId, available);
      if (response) {
        notify(
          `Cashout successful! Amount: ${formatCurrency(response.cashoutAmount)}`,
          "success",
          "check2-circle",
          3000,
        );
        void refreshAfterWalletAction();
        cashoutDialogOnSuccess.value?.();
        clearCashoutDialogSignals();
        dialogRef.current?.hide();
      } else {
        notify("Cashout failed. Please try again.", "error", "x-circle", 2500);
      }
    } catch (error) {
      console.error("Error performing cashout:", error);
      notify("Error performing cashout", "error", "x-circle", 2500);
    } finally {
      setProcessing(false);
    }
  };

  // Preact's onSlRequestClose is unreliable on <sl-dialog>; without clearing
  // signals, overlay/X close leaves isOpenedCashoutDialog true and the next
  // cashout click does not change useEffect deps, so show() never runs again.
  const listenersBound = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!listenersBound.current) {
      listenersBound.current = true;

      const onRequestClose = () => {
        clearCashoutDialogSignals();
      };

      const onAfterHide = () => {
        if (isOpenedCashoutDialog.peek()) {
          clearCashoutDialogSignals();
        }
      };

      dialog.addEventListener("sl-request-close", onRequestClose);
      dialog.addEventListener("sl-after-hide", onAfterHide);
    }

    if (isOpenedCashoutDialog.value && betId) {
      dialog.show();
    } else {
      dialog.hide();
    }
  }, [isOpenedCashoutDialog.value, betId]);

  const showUnavailable = !bet || !canAct;

  return (
    <sl-dialog
      ref={dialogRef}
      label={t("cashoutUpper")}
      className="cashoutDialog mx-auto my-auto text-[var(--text-basic-color)]"
    >
      <div className="flex flex-col gap-4 pt-1">
        <section className="rounded-2xl border border-[var(--primary-border-color)] bg-gradient-to-b from-[var(--primary-color)]/12 to-black/25 px-5 py-5 text-center">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-sub-color)]">
            {t("fullCashOut")}
          </p>
          <p className="mt-2 text-[36px] font-bold leading-none tabular-nums text-[var(--text-basic-color)]">
            {formatCurrency(available)}
          </p>
          <p className="mt-3 text-[12px] text-[var(--text-sub-color)]">
            {t("possibleWin")}: {formatCurrency(possibleWin)}
          </p>
        </section>
        {bet ? (
          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--sub-element-secondary)]/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-sub-color)]">
                  {t(bet.betType)}
                </p>
                <p className="mt-0.5 text-[14px] font-semibold text-[var(--text-basic-color)]">
                  {t("dateAndId")}: {shortBetId}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--text-sub-color)]">
                  {formatDate(bet.placedAt)},{" "}
                  {formatTime(new Date(bet.placedAt).getTime())}
                </p>
              </div>
              <span
                className="shrink-0 rounded-md border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--text-sub-color)]"
                title={bet.status}
              >
                {bet.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-black/20 px-3 py-1">
              <InfoRow
                label={t("stakePlaceholder")}
                value={formatCurrency(bet.stakeAmount)}
              />
              <InfoRow
                label={t("oddsDecimal")}
                value={Number(bet.startingOdds).toFixed(2)}
                emphasize
              />
              <InfoRow
                label={t("possibleWin")}
                value={formatCurrency(possibleWin)}
                emphasize
              />
              {bet.remainingStake < bet.stakeAmount ? (
                <InfoRow
                  label={`${t("stake")} · remaining`}
                  value={formatCurrency(bet.remainingStake)}
                />
              ) : null}
            </div>
          </section>
        ) : !showUnavailable ? (
          <p className="text-[12px] text-[var(--text-sub-color)]">
            {t("dateAndId")}: {shortBetId}
          </p>
        ) : null}

        {/* {bet && displayLegs.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-sub-color)]">
              {t("betDetails")}{" "}
              <span className="font-normal normal-case text-[var(--text-basic-color)]">
                ({bet.legs.length})
              </span>
            </h3>
            <ul className="cashoutDialog-legs max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {displayLegs.map((leg, i) => {
                const odd = selectedOddForLeg(leg);
                const sportKey = leg.sport?.name ?? "";
                return (
                  <li
                    key={`${leg.eventId}-${i}`}
                    className="rounded-lg border border-[var(--border-color)] bg-black/15 p-2.5"
                  >
                    <div className="flex gap-2">
                      {sportKey ? (
                        <img
                          src={`${BASE_ASSET_PUBLIC_URL}/sportsicons/${sportKey}.png`}
                          alt=""
                          className="mt-0.5 h-5 w-5 shrink-0 object-contain brightness-0 invert"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--text-sub-color)]">
                          {leg.league?.name || ""}
                        </p>
                        <p className="text-[13px] font-medium leading-snug text-[var(--text-basic-color)]">
                          {participantLine(leg)}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--text-basic-color)]">
                          {leg.market?.name || ""}
                          {odd?.name ? (
                            <span className="text-[var(--primary-color)]">
                              {" "}
                              · {odd.name}
                            </span>
                          ) : null}
                        </p>
                        {odd ? (
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-sub-color)]">
                            <span>
                              {t("startOdds")}:{" "}
                              <span className="text-[var(--text-basic-color)]">
                                {Number(odd.value).toFixed(2)}
                              </span>
                            </span>
                            <span>
                              {t("currentOdds")}:{" "}
                              <span className="text-[var(--primary-color)]">
                                {Number(odd.currentValue).toFixed(2)}
                              </span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {moreLegsCount > 0 ? (
              <p
                className="mt-2 text-center text-[11px] text-[var(--text-sub-color)]"
                title={`${moreLegsCount} more selections`}
              >
                +{moreLegsCount} more
              </p>
            ) : null}
          </section>
        ) : null} */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="order-2 w-full rounded-xl border border-[var(--border-color)] py-3.5 text-[14px] font-medium transition-colors hover:bg-white/5 sm:order-1 sm:w-auto sm:min-w-[120px]"
            disabled={processing}
            onClick={closeDialog}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="order-1 w-full rounded-xl bg-[var(--primary-color)] py-3.5 text-[14px] font-semibold text-[var(--on-primary-color,#fff)] shadow-lg transition-opacity disabled:opacity-50 sm:order-2 sm:w-auto sm:min-w-[160px]"
            disabled={processing}
            onClick={handleManualCashout}
          >
            {processing ? t("processing") : t("cashoutUpper")}
          </button>
        </div>
      </div>
    </sl-dialog>
  );
};
