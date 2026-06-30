/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import type { BetBuilderSlipLeg, BetslipLeg } from "@/helpers/betslipLegs";
import { legOdds } from "@/helpers/betslipLegs";

type BetSlipHeaderBarProps = {
  slipLegs: BetslipLeg[];
  bbPrices: Record<number, number | null | undefined>;
  slipLegTotal: number;
  fabTotalOdds: number;
  isExpanded: boolean;
  isMobileFabCollapsed: boolean;
  betSlipLabel: string;
  onToggle: () => void;
};

function BetBuilderHeaderPill({
  leg,
  bbPrices,
}: {
  leg: BetBuilderSlipLeg;
  bbPrices: Record<number, number | null | undefined>;
}) {
  const odds = legOdds(leg, bbPrices);

  return (
    <div className="flex max-w-full items-center gap-2 rounded-full bg-[rgba(0,0,0,0.28)] px-3 py-1.5">
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
        <span>BET+</span>
        <span className="font-bold opacity-90">BUILDER</span>
      </span>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-white">
        {odds.toFixed(2)}
      </span>
      <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#3dcc4c] px-1 text-[10px] font-bold leading-none text-white">
        {leg.selections.length}
      </span>
    </div>
  );
}

export const BetSlipHeaderBar: FunctionComponent<BetSlipHeaderBarProps> = ({
  slipLegs,
  bbPrices,
  slipLegTotal,
  fabTotalOdds,
  isExpanded,
  isMobileFabCollapsed,
  betSlipLabel,
  onToggle,
}) => {
  const bbLegs = slipLegs.filter(
    (leg): leg is BetBuilderSlipLeg => leg.type === "betbuilder",
  );
  const regularLegCount = slipLegs.filter((leg) => leg.type === "regular").length;
  const showLeftMultibetOdds =
    regularLegCount > 0 || slipLegTotal > 1 || bbLegs.length === 0;

  if (isMobileFabCollapsed) {
    return (
      <button
        type="button"
        className="relative flex h-[72px] w-[72px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-full bg-[var(--primary-color)] text-[var(--text-basic-color)] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
        onClick={onToggle}
        aria-label={betSlipLabel}
      >
        <span className="text-[15px] font-bold leading-none tabular-nums">
          {fabTotalOdds.toFixed(2)}
        </span>
        <span className="absolute -right-0.5 -top-0.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--background-element)] px-[5px] text-[11px] font-bold leading-none text-[var(--text-basic-color)]">
          {slipLegTotal}
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex w-full cursor-pointer items-center justify-between bg-[var(--primary-color)] px-6 py-3"
      onClick={onToggle}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative flex h-full shrink-0 items-center">
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/bet.png`}
            alt="Bet Slip"
            className="h-8 w-8"
          />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sub-element-color)] text-[10px] font-bold text-[var(--text-basic-color)]">
            {slipLegTotal}
          </span>
        </div>

        {showLeftMultibetOdds ? (
          <span className="shrink-0 text-[15px] font-bold tabular-nums text-[var(--text-basic-color)]">
            {fabTotalOdds.toFixed(2)}
          </span>
        ) : null}

        {bbLegs.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {bbLegs.map((leg) => (
              <BetBuilderHeaderPill
                key={leg.eventId}
                leg={leg}
                bbPrices={bbPrices}
              />
            ))}
          </div>
        ) : null}
      </div>

      <img
        src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
        alt="Toggle"
        className={`h-6 w-6 shrink-0 ${isExpanded ? "rotate-90" : "-rotate-90"}`}
      />
    </div>
  );
};
