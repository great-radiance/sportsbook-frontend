/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { OddsMoveIndicator } from "@/app/components/OddsMoveIndicator";
import type {
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";

type RacingOddsCellProps = {
  eventId: number;
  marketId: number;
  market: tMarketModel;
  selection: tSelectionValue | undefined;
  scratched?: boolean;
  showSp?: boolean;
};

function selectionCompetitorId(
  sel: tSelectionValue | undefined,
): number | null {
  if (!sel) return null;
  const raw =
    (sel as tSelectionValue & { competitorId?: number }).competitorId ??
    sel.extraParameters?.competitorId;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export const RacingOddsCell: FunctionComponent<RacingOddsCellProps> = ({
  eventId,
  marketId,
  market,
  selection,
  scratched = false,
  showSp = false,
}) => {
  const tradingStatus = market.tradingStatus;
  const baseClass =
    "flex min-w-[64px] w-full h-[32px] items-center justify-center rounded-[6px] border border-[var(--border-color)] bg-[var(--sub-element-secondary)] text-[12px] font-semibold";

  if (scratched || !selection) {
    return (
      <div className={`${baseClass} text-[var(--text-sub-color)] opacity-50`}>
        <span>—</span>
      </div>
    );
  }

  const selectionId = selection.id;
  const isSuspended = selection.status === 1 || tradingStatus === 1;
  const isClosed = selection.status === 2 || selection.status === 3;

  if (isClosed) {
    return (
      <div className={`${baseClass} text-[var(--text-sub-color)]`}>
        <span>—</span>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className={baseClass}>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
          className="w-[14px] h-[14px] brightness-0 invert"
          alt=""
        />
      </div>
    );
  }

  const price = selection.price;
  const display =
    price != null && Number.isFinite(price)
      ? price.toFixed(2)
      : showSp
        ? "SP"
        : "—";

  const selected = isBetslipSelectionSelected(eventId, marketId, selectionId);

  return (
    <button
      type="button"
      className={`relative ${baseClass} cursor-pointer transition-colors ${
        selected
          ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)]"
          : "text-[var(--text-primary-color)] hover:bg-[var(--primary-color)] hover:text-white hover:border-[var(--primary-color)]"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        toggleBetslipSelection({
          eventId,
          marketId,
          marketName: market.name,
          selection,
          apiMarketId: market.id,
        });
      }}
    >
      <span>{display}</span>
      <OddsMoveIndicator mv={selection.mv} />
    </button>
  );
};

export { selectionCompetitorId };
