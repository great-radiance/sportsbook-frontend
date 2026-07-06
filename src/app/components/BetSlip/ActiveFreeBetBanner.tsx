/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import type { ActiveFreeBet } from "@/api/bonuses/apiGetActiveBonus";
import { getCurrencySymbol } from "@/shared/utils/formatters";
import {
  formatApplicableBetTypes,
  formatFreeBetExpiry,
} from "@/helpers/freeBetDisplay";

type ActiveFreeBetBannerProps = {
  freeBet: ActiveFreeBet;
  locale: string;
  t: (key: string) => string;
};

export const ActiveFreeBetBanner: FunctionComponent<ActiveFreeBetBannerProps> = ({
  freeBet,
  locale,
  t,
}) => {
  const symbol = getCurrencySymbol(freeBet.currency);
  const betTypes = formatApplicableBetTypes(freeBet.applicableBetTypes, {
    single: t("freeBetSingle"),
    parlay: t("freeBetParlay"),
    both: t("freeBetBoth"),
  });

  return (
    <div className="mb-2 overflow-hidden rounded-[8px] border border-[var(--primary-color)] bg-[var(--primary-soft-bg)]">
      <div className="flex gap-2.5 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--highlight-background)] text-[var(--primary-color)]">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden
          >
            <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z" />
            <path d="M6 12h12" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-color)]">
            {t("freeBetAvailable")}
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[var(--text-basic-color)]">
            {symbol}
            {freeBet.freebetAmount} {freeBet.currency}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-sub-color)]">
            {t("freeBetStakeLocked")}
          </p>
        </div>
        <span className="inline-flex h-fit shrink-0 items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] text-[var(--text-sub-color)]">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {formatFreeBetExpiry(freeBet.expiresAt, locale)}
        </span>
      </div>
      <div className="border-t border-[var(--border-color)] px-3 py-2 text-[10px] text-[var(--text-sub-color)]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            {t("freeBetMinOdds")}: {freeBet.minOdds.toFixed(2)}
          </span>
          <span>
            {t("freeBetValidFor")}: {betTypes}
          </span>
        </div>
        {freeBet.wageringTarget > 0 ? (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span>{t("freeBetWagering")}</span>
              <span className="font-semibold tabular-nums text-[var(--text-basic-color)]">
                {freeBet.progressPercent}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-[var(--primary-color)] transition-[width] duration-500"
                style={{ width: `${Math.min(100, freeBet.progressPercent)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] leading-snug">{t("freeBetWageringHint")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
