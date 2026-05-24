/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useLocation } from "wouter-preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { formatStartDate, formatStartTime } from "@/helpers/formatEventTime";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { OddsMoveIndicator } from "@/app/components/OddsMoveIndicator";
import { storeState } from "@/state/storeState";
import type {
  tMarketModel,
  tSelectionValue,
} from "@/types/typesForSocket.ts/tEventModel";
import {
  eventHasStoredMarkets,
  matchResultCells,
  overUnderButtonLabel,
  overUnderCells,
  resolveThirdColumnKind,
  resolveUpcomingMatchMarkets,
  thirdColumnCells,
  thirdColumnSelectionLabel,
  thirdColumnSlot,
} from "@/helpers/upcomingMatchMarkets";
import {
  UPCOMING_MATCH_COL_GROUP,
  UPCOMING_MATCH_COL_MARKETS,
  UPCOMING_MATCH_COL_MATCH,
  UPCOMING_MATCH_ROW,
} from "./upcomingMatchLayout";
import { Match } from "../MatchesBoard/components/Match";
import { isMobile } from "@/state/isMobile";

export {
  UPCOMING_MATCH_COL_CELL,
  UPCOMING_MATCH_COL_GROUP,
  UPCOMING_MATCH_COL_MARKETS,
  UPCOMING_MATCH_COL_MATCH,
  UPCOMING_MATCH_HEADER,
} from "./upcomingMatchLayout";

type UpcomingMatchRowProps = {
  eventId: number;
  sportId: number;
};

const oddBtnBase =
  "relative min-h-[34px] min-w-0 flex-1 rounded-[4px] transition-colors";
const oddBtnIdle = "bg-[var(--primary-soft-bg)] hover:brightness-110";
const oddBtnActive = "bg-[var(--primary-color)]";

function formatPrice(selection: tSelectionValue | undefined): string {
  return selection?.price != null ? selection.price.toFixed(2) : "-";
}

function isRealLabel(label?: string): label is string {
  return Boolean(label && label !== "—" && label !== "-");
}

function OddCell({
  eventId,
  market,
  selection,
  label,
}: {
  eventId: number;
  market: tMarketModel | undefined;
  selection: tSelectionValue | undefined;
  label?: string;
}) {
  const realLabel = isRealLabel(label) ? label : undefined;

  if (!market || !selection) {
    return (
      <div
        className={`${oddBtnBase} ${oddBtnIdle} flex items-center justify-center px-1`}
      >
        <span className="text-[14px] font-bold leading-none text-[var(--text-sub-color)]">
          -
        </span>
      </div>
    );
  }

  const suspended = selection.status === 1 || market.tradingStatus === 1;
  const closed = selection.status === 2 || selection.status === 3;
  const selected = isBetslipSelectionSelected(eventId, market.id, selection.id);

  if (closed || suspended) {
    if (suspended) {
      return (
        <div
          className={`${oddBtnBase} ${oddBtnIdle} flex items-center justify-center px-1`}
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
            className="h-3.5 w-3.5 shrink-0 brightness-0 invert opacity-70"
            alt=""
          />
        </div>
      );
    }

    return (
      <div
        className={`${oddBtnBase} ${oddBtnIdle} flex items-center justify-center px-1`}
      >
        <span className="text-[14px] font-bold leading-none text-[var(--text-sub-color)]">
          -
        </span>
      </div>
    );
  }

  if (selection.price == null) {
    return (
      <div
        className={`${oddBtnBase} ${oddBtnIdle} flex items-center justify-center px-1`}
      >
        <span className="text-[14px] font-bold leading-none text-[var(--text-sub-color)]">
          -
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${oddBtnBase} flex items-center ${
        realLabel ? "justify-between gap-2 px-2" : "justify-center px-1"
      } ${selected ? oddBtnActive : oddBtnIdle}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleBetslipSelection({
          eventId,
          marketId: market.id,
          marketName: market.name,
          selection,
          apiMarketId: market.id,
        });
      }}
    >
      {realLabel && (
        <span
          className={`truncate text-[11px] font-medium leading-none ${
            selected ? "text-white/90" : "text-[var(--text-basic-color)]"
          }`}
        >
          {realLabel}
        </span>
      )}
      <span
        className={`${realLabel ? "shrink-0" : ""} text-[14px] font-bold leading-none tabular-nums ${
          selected ? "text-white" : "text-[var(--text-primary-color)]"
        }`}
      >
        {formatPrice(selection)}
      </span>
      <OddsMoveIndicator mv={selection.mv} />
    </button>
  );
}

function MarketGroup({ children }: { children: preact.ComponentChildren }) {
  return <div className={UPCOMING_MATCH_COL_GROUP}>{children}</div>;
}

export const UpcomingMatchRow: FunctionComponent<UpcomingMatchRowProps> = ({
  eventId,
  sportId,
}) => {
  const [, setLocation] = useLocation();
  const event = storeState.value[eventId]?.value;
  // if (!eventHasStoredMarkets(event)) return null;

  const slots = resolveUpcomingMatchMarkets(
    Object.values(event.markets ?? {}).map((sig) => sig.value),
  );
  const thirdKind = resolveThirdColumnKind(slots, sportId, event.sport?.name);
  const thirdCol = thirdColumnSlot(slots, thirdKind);
  const [ouOver, ouUnder] = overUnderCells(slots.overUnder.market);
  const [thirdA, thirdB] = thirdColumnCells(thirdCol.market);

  const home = event.competitors?.[0]?.name ?? "";
  const away = event.competitors?.[1]?.name ?? "";
  const startMs = new Date(event.startTime || "").getTime();
  const isLive = event.status === 3;
  const eventPath = `/event-view/${isLive ? "live" : "pre-match"}/${event.sport.name}/${event.sport.id}/${event.region.name}/${event.region.id}/${event.league.name}/${event.league.id}/${event.id}`;

  return (
    <div className={UPCOMING_MATCH_ROW}>
      <button
        type="button"
        className={`${UPCOMING_MATCH_COL_MATCH} flex items-center gap-2.5 text-left`}
        onClick={(e) => linkButtonOnClick(e, eventPath, setLocation)}
      >
        <div className="flex w-[38px] shrink-0 flex-col leading-tight text-[var(--text-sub-color)]">
          <span className="text-[11px] tabular-nums">
            {Number.isFinite(startMs) ? formatStartDate(startMs) : "-"}
          </span>
          <span className="text-[11px] tabular-nums">
            {Number.isFinite(startMs) ? formatStartTime(startMs) : "-"}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-bold leading-tight text-[var(--text-basic-color)]">
            {home}
          </span>
          <span className="truncate text-[13px] font-bold leading-tight text-[var(--text-basic-color)]">
            {away}
          </span>
        </div>
      </button>

      <div
        className={UPCOMING_MATCH_COL_MARKETS}
        onClick={(e) => e.stopPropagation()}
      >
        <MarketGroup>
          {matchResultCells(slots.matchResult.market).map((sel, i) => (
            <OddCell
              key={`mr-${i}`}
              eventId={eventId}
              market={slots.matchResult.market}
              selection={sel}
            />
          ))}
        </MarketGroup>

        <MarketGroup>
          <OddCell
            eventId={eventId}
            market={slots.overUnder.market}
            selection={ouOver}
            label={overUnderButtonLabel(ouOver)}
          />
          <OddCell
            eventId={eventId}
            market={slots.overUnder.market}
            selection={ouUnder}
            label={overUnderButtonLabel(ouUnder)}
          />
        </MarketGroup>

        <MarketGroup>
          <OddCell
            eventId={eventId}
            market={thirdCol.market}
            selection={thirdA}
            label={thirdColumnSelectionLabel(thirdKind, thirdA)}
          />
          <OddCell
            eventId={eventId}
            market={thirdCol.market}
            selection={thirdB}
            label={thirdColumnSelectionLabel(thirdKind, thirdB)}
          />
        </MarketGroup>
      </div>
    </div>
  );
};
