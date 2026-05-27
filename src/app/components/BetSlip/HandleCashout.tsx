import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  extractApiErrorMessage,
  fullCashout,
  partialCashout,
  setAutoCashout,
  cashoutAmountForBet,
} from "@/api/bet/cashout";
import type { BetItemType } from "@/shared/utils/bet";
import { formatCurrency } from "@/shared/utils/formatters";
import { currency } from "@/state/betState";
import { notify } from "@/shared/toast";
import { Select, SelectItem } from "@/app/components/Select";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";

interface HandleCashoutProps {
  betId: string;
  onClose: () => void;
  onSuccess?: () => void;
  bet: BetItemType | null;
}

type PriceChangePolicy =
  | "always-ask"
  | "accept-higher-odds"
  | "accept-any-odds";
type CashoutType = "full";

export const HandleCashout: FunctionComponent<HandleCashoutProps> = ({
  betId,
  onClose,
  onSuccess,
  bet,
}) => {
  const availableCashout = bet ? cashoutAmountForBet(bet) : 0;
  const canCashout = Boolean(bet) && availableCashout > 0;
  const { t } = useTranslate("betslip");
  const { t: tCommon } = useTranslate("common");
  const [selectedTab, setSelectedTab] = useState<"Manual">("Manual");
  //  | "Auto"
  const [priceChangePolicy, setPriceChangePolicy] =
    useState<PriceChangePolicy>("always-ask");
  const [cashoutType, setCashoutType] = useState<CashoutType>("full");
  const [partialAmount, setPartialAmount] = useState<number>(
    0.5 * availableCashout || 0,
  );
  const [partialPercentage, setPartialPercentage] = useState<number>(50);
  // const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);

  // Auto cashout state
  const [autoType, setAutoType] = useState<
    "winning_amount" | "losing_amount" | "percentage"
  >("winning_amount");
  const [autoTargetValue, setAutoTargetValue] = useState<number>(0);
  const [autoIsPartial, setAutoIsPartial] = useState<boolean>(false);
  const [autoPartialPercentage, setAutoPartialPercentage] =
    useState<number>(50);
  const [autoTargetError, setAutoTargetError] = useState<string>("");
  const priceChangeOptions = [
    { value: "always-ask", label: t("alwaysAsk") },
    { value: "accept-higher-odds", label: t("acceptHigherOdds") },
    { value: "accept-any-odds", label: t("acceptAnyOdds") },
  ];

  const handleManualCashout = async () => {
    if (!canCashout) {
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
      let response;
      if (cashoutType === "full") {
        response = await fullCashout(betId, availableCashout);
      } else {
        const percentage =
          (partialAmount / availableCashout) * 100;
        if (percentage <= 0 || percentage >= 100) {
          notify(
            "Partial cashout percentage must be between 0.01 and 100",
            "error",
            "x-circle",
            2500,
          );
          setProcessing(false);
          return;
        }
        response = await partialCashout(betId, percentage);
      }

      if (response) {
        notify(
          `Cashout successful! Amount: ${formatCurrency(response.cashoutAmount)}`,
          "success",
          "check2-circle",
          3000,
        );
        onSuccess?.();
        onClose();
      } else {
        notify("Cashout amount is invalid", "error", "x-circle", 2500);
      }
    } catch (error) {
      console.error("Error performing cashout:", error);
      notify(
        extractApiErrorMessage(error, "Error performing cashout"),
        "error",
        "x-circle",
        3500,
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAutoRule = async () => {
    if (!autoTargetValue || autoTargetValue <= 0) {
      setAutoTargetError("This field is required");
      return;
    }

    setAutoTargetError("");
    setProcessing(true);

    try {
      const response = await setAutoCashout({
        betId,
        enabled: true,
        type: autoType,
        targetValue: autoTargetValue,
        isPartial: autoIsPartial,
        partialPercentage: autoIsPartial ? autoPartialPercentage : undefined,
      });

      if (response) {
        notify(
          "Auto cashout rule created successfully",
          "success",
          "check2-circle",
          3000,
        );
        onSuccess?.();
        onClose();
      } else {
        notify("Failed to create auto cashout rule", "error", "x-circle", 2500);
      }
    } catch (error) {
      console.error("Error creating auto cashout rule:", error);
      notify("Error creating auto cashout rule", "error", "x-circle", 2500);
    } finally {
      setProcessing(false);
    }
  };

  const handlePartialSliderChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    setPartialPercentage(value);
    if (canCashout) {
      setPartialAmount((availableCashout * value) / 100);
    }
  };

  const handlePartialAmountChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value) || 0;
    setPartialAmount(value);
    if (canCashout && availableCashout > 0) {
      const percentage = (value / availableCashout) * 100;
      setPartialPercentage(Math.min(100, Math.max(0, percentage)));
    }
  };

  const getMinMaxValues = () => {
    if (!canCashout) return { min: 0, max: 100 };
    return {
      min: 1.01,
      max: availableCashout || 100,
    };
  };

  if (!canCashout) {
    return (
      <div className="w-full max-w-[400px] mx-auto bg-[var(--background-color)] rounded-[4px] p-4">
        <div className="w-full px-[15px] h-[49px] flex items-center justify-between">
          <span className="text-[16px] font-normal">{t("cashout")}</span>
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/close.png`}
            alt="close"
            className="w-3 cursor-pointer"
            onClick={onClose}
          />
        </div>
        <div className="py-8 text-center">
          <span className="text-[14px]">
            {t("cashoutNotAvailable")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile.value ? "w-[100vw] h-[100vh]" : "w-[400px] max-w-full"} mx-auto bg-[var(--sub-element-color)] rounded-[4px] p-4 text-[var(--text-basic-color)]`}
    >
      {/* Header */}
      <div className="w-full px-[15px] h-[49px] flex items-center justify-between">
        <span className="text-[16px] font-normal">{t("cashoutUpper")}</span>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/close.png`}
          alt="close"
          className="w-3 cursor-pointer"
          onClick={onClose}
        />
      </div>

      {/* Tabs */}
      {/* <div className="w-full flex items-center border-b border-white/10">
        {(["Manual", "Auto"] as const).map((tab) => (
          <div
            key={tab}
            className={`w-full flex items-center justify-center py-2 cursor-pointer ${
              selectedTab === tab
                ? "border-b-[2px] border-b-[var(--primary-color)]"
                : ""
            }`}
            onClick={() => setSelectedTab(tab)}
          >
            <span className="text-[14px] font-normal">
              {tab === "Manual" ? t("manual") : t("auto")}
            </span>
          </div>
        ))}
      </div> */}

      {/* Manual Tab Content */}
      {selectedTab === "Manual" && (
        <div className="flex flex-col gap-4 mt-4 my-10">
          {/* Price Change Policy */}
          {/* <div className="flex flex-col gap-2">
            <label className="text-[12px]">{t("autoAcceptPriceChanges")}</label>
            <Select
              value={priceChangePolicy}
              onSelect={(value) =>
                setPriceChangePolicy(value as PriceChangePolicy)
              }
              className="w-full"
              classNames={{
                trigger:
                  "w-full px-3 py-2 border-[1px] border-[var(--primary-border-color)] text-[12px] rounded-[4px]",
                panel: "bg-[var(--background-color)] rounded-[4px] mt-1",
                item: `px-3 py-2 text-[12px]  ${!isMobile.value ? "hover:bg-white/10" : ""}`,
              }}
            >
              {priceChangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div> */}

          {/* Cashout Type Selection */}
          {/* <div className="flex flex-col gap-3">
            <label
              className={`flex items-center gap-2 cursor-pointer ${
                cashoutType === "full" ? "text-[var(--primary-color)]" : ""
              }`}
              onClick={() => setCashoutType("full")}
            >
              <input
                type="radio"
                name="cashoutType"
                checked={cashoutType === "full"}
                onChange={() => setCashoutType("full")}
                className="w-4 h-4 border-[1px] border-[var(--primary-border-color)] accent-[var(--primary-color)]"
              />
              <span className="text-[14px]">
                {t("fullCashOut")}{" "}
                {formatCurrency({ canCashout: availableCashout > 0, availableCashout, bet }.availableCashout)}
              </span>
            </label>

            <label
              className={`flex items-center gap-2 cursor-pointer ${
                cashoutType === "partial" ? "text-[var(--primary-color)]" : ""
              }`}
              onClick={() => setCashoutType("partial")}
            >
              <input
                type="radio"
                name="cashoutType"
                checked={cashoutType === "partial"}
                onChange={() => setCashoutType("partial")}
                className="w-4 h-4 accent-[var(--primary-color)] border-[1px] border-[var(--primary-border-color)]"
              />
              <span className="text-[14px]">{t("partialCashOut")}</span>
            </label>
          </div> */}

          {/* Partial Cashout Controls */}
          {/* {cashoutType === "partial" && (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
              <input
                type="number"
                value={partialAmount.toFixed(2)}
                onInput={handlePartialAmountChange}
                placeholder={t("amountSliderPlaceholder")}
                className="w-full px-3 py-2 bg-white/10 text-[12px] rounded-[4px] border border-[var(--primary-border-color)] focus:outline-none focus:border-[var(--primary-color)]"
                min={0}
                max={{ canCashout: availableCashout > 0, availableCashout, bet }.availableCashout}
                step={0.01}
              />
              <div className="flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={partialPercentage}
                  onInput={handlePartialSliderChange}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
                  style={{
                    background: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${partialPercentage}%, rgba(255,255,255,0.2) ${partialPercentage}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px]">
                  <span>0%</span>
                  <span>{partialPercentage.toFixed(1)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )} */}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleManualCashout}
              disabled={
                // processing || (cashoutType === "partial" && partialAmount <= 0)
                processing
              }
              className={`w-full py-3 px-4 rounded-[4px] text-[14px] font-medium transition-colors ${
                // processing || (cashoutType === "partial" && partialAmount <= 0)
                processing
                  ? "bg-white/10  cursor-not-allowed"
                  : `bg-[var(--primary-color)] text-black ${!isMobile.value ? "hover:opacity-90" : ""}`
              }`}
            >
              {processing ? t("processing") : t("cashoutUpper")}
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 bg-white/10  text-[14px] font-medium rounded-[4px] transition-colors ${!isMobile.value ? "hover:bg-white/20" : ""}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Auto Tab Content */}
      {/* {selectedTab === "Auto" && (
        <div className="flex flex-col gap-4 mt-4"> */}
      {/* Target Value Input */}
      {/* <div className="flex flex-col gap-2">
            <label className="text-[12px]">{t("ifValueReaches")}</label>
            <input
              type="number"
              value={autoTargetValue || ""}
              onInput={(e) => {
                const value =
                  parseFloat((e.target as HTMLInputElement).value) || 0;
                setAutoTargetValue(value);
                setAutoTargetError(value <= 0 ? tCommon("fieldRequired") : "");
              }}
              placeholder={t("enterTargetValue")}
              className={`w-full px-3 py-2 bg-white/10  text-[12px] rounded-[4px] border focus:outline-none ${
                autoTargetError
                  ? "border-red-500"
                  : "border-[var(--primary-border-color)] focus:border-[var(--primary-color)]"
              }`}
              min={0.01}
              step={0.01}
            />
            {autoTargetError && (
              <span className="text-[11px] text-red-400">
                {autoTargetError}
              </span>
            )} */}
      {/* Value Range Indicator */}
      {/* <div className="flex justify-between text-[10px] px-1">
              <span>1.01</span>
              <span>{formatCurrency({ canCashout: availableCashout > 0, availableCashout, bet }.availableCashout * 2)}</span>
            </div>
          </div> */}

      {/* Auto Cashout Type Selection */}
      {/* <div className="flex flex-col gap-3">
            <label
              className={`flex items-center gap-2 cursor-pointer ${
                !autoIsPartial ? "text-[var(--primary-color)]" : ""
              }`}
              onClick={() => setAutoIsPartial(false)}
            >
              <input
                type="radio"
                name="autoCashoutType"
                checked={!autoIsPartial}
                onChange={() => setAutoIsPartial(false)}
                className="w-4 h-4 accent-[var(--primary-color)]"
              />
              <span className="text-[14px]">{t("fullCashOut")}</span>
            </label>

            <label
              className={`flex items-center gap-2 cursor-pointer ${
                autoIsPartial ? "text-[var(--primary-color)]" : ""
              }`}
              onClick={() => setAutoIsPartial(true)}
            >
              <input
                type="radio"
                name="autoCashoutType"
                checked={autoIsPartial}
                onChange={() => setAutoIsPartial(true)}
                className="w-4 h-4 accent-[var(--primary-color)]"
              />
              <span className="text-[14px]">{t("partialCashOut")}</span>
            </label>
          </div> */}

      {/* Partial Percentage for Auto */}
      {/* {autoIsPartial && (
            <div className="flex flex-col gap-2">
              <label className="text-[12px]">{t("partialPercentage")}</label>
              <input
                type="number"
                value={autoPartialPercentage}
                onInput={(e) => {
                  const value =
                    parseFloat((e.target as HTMLInputElement).value) || 0;
                  setAutoPartialPercentage(
                    Math.min(100, Math.max(0.01, value)),
                  );
                }}
                className="w-full px-3 py-2 bg-white/10 text-[12px] rounded-[4px] border border-[var(--primary-border-color)] focus:outline-none focus:border-[var(--primary-color)]"
                min={0.01}
                max={100}
                step={0.01}
              />
            </div>
          )} */}

      {/* Action Buttons */}
      {/* <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleCreateAutoRule}
              disabled={processing || !autoTargetValue || autoTargetValue <= 0}
              className={`w-full py-3 px-4 rounded-[4px] text-[14px] font-medium transition-colors ${
                processing || !autoTargetValue || autoTargetValue <= 0
                  ? "bg-white/10  cursor-not-allowed"
                  : `bg-[var(--primary-color)] text-black ${!isMobile.value ? "hover:opacity-90" : ""}`
              }`}
            >
              {processing ? t("creating") : t("createRule")}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-[14px] font-medium rounded-[4px] transition-colors border border-white/20"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
};
