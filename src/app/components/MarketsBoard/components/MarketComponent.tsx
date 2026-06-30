/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { formatSnakeCaseMarketName } from "@/helpers/completeName";
import { getOddName } from "@/helpers/getOnlyNumber";
import { OddsMoveIndicator } from "@/app/components/OddsMoveIndicator";
import {
  isEventBettable,
  isMarketClosed,
  isSelectionBettable,
  isSelectionClosed,
  isSelectionSuspended,
} from "@/helpers/marketAvailability";
import { useTranslate } from "@/shared/i18n/i18n";
import type { tSelectionSignal } from "@/types/typesForSocket.ts/tEventModel";

const ALTERNATIVE_PREVIEW_ROWS = 2;

type SelectionEntry = {
  sig: tSelectionSignal;
  mid: number;
};

type MarketRow = {
  mid: number;
  isBestLine: boolean;
  selections: SelectionEntry[];
};

interface MarketProps {
  Collapsed?: boolean;
  marketId: number | number[];
  eventId: number;
  type: number;
  displayOrder?: number;
}

function rowHasVisibleSelections(
  row: MarketRow,
  marketTradingStatus: number | undefined,
): boolean {
  if (isMarketClosed(marketTradingStatus)) return false;
  return row.selections.some(
    ({ sig }) => !isSelectionClosed(sig.value.status),
  );
}

export const MarketComponent: FunctionComponent<MarketProps> = ({
  Collapsed = false,
  marketId,
  eventId,
  type,
  displayOrder,
}) => {
  const { isBuilding, isMobile, storeState } = useSportsbookStore();
  const { t: tMarkets } = useTranslate("markets");
  const [isCollapsed, setIsCollapsed] = useState(Collapsed);
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);

  useEffect(() => {
    setIsCollapsed(Collapsed);
  }, [Collapsed]);

  const event = storeState.value[eventId]?.value;
  const marketIds = Array.isArray(marketId) ? marketId : [marketId];
  const primaryId = marketIds[0];
  const primaryMarket = event?.markets?.[primaryId]?.value;
  const name = formatSnakeCaseMarketName(primaryMarket?.name ?? "");
  const eventTradingStatus = event?.tradingStatus;

  const getMarketTradingStatus = (mid: number): number | undefined =>
    event?.markets?.[mid]?.value.tradingStatus;

  const getSelectionsForMarket = (mid: number): SelectionEntry[] => {
    if (isMarketClosed(getMarketTradingStatus(mid))) return [];

    const raw = (event?.markets?.[mid]?.value.selections ?? [])
      .sort((a, b) => a.value.id - b.value.id)
      .map((sig) => ({ sig, mid }));

    return isBuilding.value
      ? raw.filter(({ sig }) => sig.value.isBetBuilderSupported)
      : raw;
  };

  const marketRows = useMemo((): MarketRow[] => {
    const buildRow = (
      mid: number,
      isBestLine: boolean,
      selections: SelectionEntry[],
    ): MarketRow | null => {
      const mts = getMarketTradingStatus(mid);
      if (isMarketClosed(mts) || selections.length === 0) return null;
      const row: MarketRow = { mid, isBestLine, selections };
      return rowHasVisibleSelections(row, mts) ? row : null;
    };

    if (marketIds.length > 1) {
      return marketIds
        .map((mid) =>
          buildRow(
            mid,
            event?.markets?.[mid]?.value?.isBestLine ?? false,
            getSelectionsForMarket(mid),
          ),
        )
        .filter((row): row is MarketRow => row != null);
    }

    const primaryMts = getMarketTradingStatus(primaryId);
    if (isMarketClosed(primaryMts)) return [];

    const allSelections = getSelectionsForMarket(primaryId);
    if (allSelections.length === 0) return [];

    const columns = Math.min(3, Math.max(1, allSelections.length));
    const rows: MarketRow[] = [];

    for (let i = 0; i < allSelections.length; i += columns) {
      const chunk = allSelections.slice(i, i + columns);
      const row = buildRow(primaryId, i === 0, chunk);
      if (row) rows.push(row);
    }

    return rows;
  }, [event?.markets, isBuilding.value, marketIds, primaryId]);

  const getApiMarketId = (mid: number): number =>
    event?.markets?.[mid]?.value.id ?? mid;

  const bestLineRow = useMemo(() => {
    if (marketRows.length === 0) return undefined;
    return marketRows.find((row) => row.isBestLine) ?? marketRows[0];
  }, [marketRows]);

  const alternativeRows = useMemo(
    () =>
      marketRows.filter(
        (row) =>
          row !== bestLineRow &&
          rowHasVisibleSelections(row, getMarketTradingStatus(row.mid)),
      ),
    [marketRows, bestLineRow, event?.markets],
  );

  const visibleAlternativeRows = showAllAlternatives
    ? alternativeRows
    : alternativeRows.slice(0, ALTERNATIVE_PREVIEW_ROWS);
  const hasHiddenAlternatives =
    alternativeRows.length > ALTERNATIVE_PREVIEW_ROWS;

  const isBetBuilderSupported = marketIds.some(
    (mid) => event?.markets?.[mid]?.value?.isBetBuilderSupported,
  );

  if (!event || !isEventBettable(eventTradingStatus)) {
    return null;
  }

  if (!bestLineRow || bestLineRow.selections.length === 0) {
    return null;
  }

  if (isBuilding.value && marketRows.length === 0) {
    return null;
  }

  return (
    <div
      key={`market-component-${marketIds.join("_")}-${eventId}`}
      className="relative flex flex-col w-full overflow-hidden rounded-[12px] border bg-[var(--sub-element-color)] text-[var(--text-basic-color)] border-[var(--border-color)]"
      style={{ order: displayOrder ?? type }}
    >
      {isBetBuilderSupported ? (
        <span
          className="absolute top-0 right-0 z-[1] min-w-[30px] px-[7px] py-[3px] text-[10px] font-bold leading-none tracking-tight text-center bg-[var(--highlight-background)] text-white/90 rounded-tr-[12px] rounded-bl-[10px]"
          aria-hidden
        >
          {tMarkets("betBuilderShortLabel")}
        </span>
      ) : null}

      <div className="flex flex-col w-full justify-center rounded-[8px] p-3">
        <div
          className={`flex items-start w-full gap-2 ${!isCollapsed && "border-b-[1px] border-[var(--border-color)] pb-2"}`}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-1 min-w-0 pr-2 text-left cursor-pointer transition-colors"
          >
            <span className="text-[12px]">{name}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex shrink-0 cursor-pointer ${isBetBuilderSupported ? "mt-[18px]" : ""}`}
            aria-label={isCollapsed ? "Expand market" : "Collapse market"}
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className={`w-[14px] h-[14px] transition-transform duration-200 ${
                isCollapsed ? "rotate-90" : "-rotate-90"
              }`}
              alt=""
            />
          </button>
        </div>

        <div
          className="flex flex-col gap-[1px] overflow-hidden"
          style={{
            maxHeight: isCollapsed ? 0 : "fit-content",
            opacity: isCollapsed ? 0 : 1,
            visibility: isCollapsed ? "hidden" : "visible",
            transition:
              "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, visibility 0.2s ease-in-out",
          }}
        >
          <div className="flex flex-col gap-2 mt-2">
            <MarketSelectionsGrid
              entries={bestLineRow.selections}
              columns={Math.min(3, Math.max(1, bestLineRow.selections.length))}
              eventId={eventId}
              marketName={name}
              eventTradingStatus={eventTradingStatus}
              getMarketTradingStatus={getMarketTradingStatus}
              getApiMarketId={getApiMarketId}
              isMobile={isMobile.value}
            />

            {alternativeRows.length > 0 ? (
              <>
                <span className="text-[11px] text-[var(--text-sub-color)]">
                  {tMarkets("alternativeOptions")}
                </span>
                {visibleAlternativeRows.map((row) => (
                  <MarketSelectionsGrid
                    key={`alt-${row.mid}-${row.selections[0]?.sig.value.id ?? 0}`}
                    entries={row.selections}
                    columns={Math.min(3, Math.max(1, row.selections.length))}
                    eventId={eventId}
                    marketName={name}
                    eventTradingStatus={eventTradingStatus}
                    getMarketTradingStatus={getMarketTradingStatus}
                    getApiMarketId={getApiMarketId}
                    isMobile={isMobile.value}
                  />
                ))}
                {hasHiddenAlternatives && !showAllAlternatives ? (
                  <button
                    type="button"
                    onClick={() => setShowAllAlternatives(true)}
                    className="w-full py-2 text-[11px] font-semibold tracking-wide text-[var(--text-basic-color)] cursor-pointer"
                  >
                    {tMarkets("showAll")}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

function MarketSelectionsGrid({
  entries,
  columns,
  eventId,
  marketName,
  eventTradingStatus,
  getMarketTradingStatus,
  getApiMarketId,
  isMobile,
}: {
  entries: SelectionEntry[];
  columns: number;
  eventId: number;
  marketName: string;
  eventTradingStatus: number | undefined;
  getMarketTradingStatus: (mid: number) => number | undefined;
  getApiMarketId: (mid: number) => number;
  isMobile: boolean | undefined;
}) {
  return (
    <div
      className="grid w-full gap-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {entries.map(({ sig: selection, mid }, index) => {
        if (!selection) return null;
        const cellKey = `${mid}-${selection.value.id ?? index}`;
        const marketTradingStatus = getMarketTradingStatus(mid);

        if (isSelectionSuspended(selection.value.status, marketTradingStatus)) {
          return (
            <div
              key={cellKey}
              className="flex items-center border bg-[var(--sub-element-secondary)] border-[var(--border-color)] justify-center px-[10px] py-2 text-[12px] rounded-[8px] min-w-0"
            >
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
                className="w-[16px] h-[16px] brightness-0 invert"
                alt="lock"
              />
            </div>
          );
        }

        if (isSelectionClosed(selection.value.status)) {
          return (
            <span
              key={cellKey}
              className="flex items-center border bg-[var(--sub-element-secondary)] border-[var(--border-color)] justify-center px-[10px] py-2 text-[12px] rounded-[8px] text-[var(--text-primary-color)] min-w-0"
            >
              -
            </span>
          );
        }

        const apiMid = getApiMarketId(mid);
        const bettable = isSelectionBettable(
          selection.value.status,
          marketTradingStatus,
          eventTradingStatus,
        );
        const selected = isBetslipSelectionSelected(
          eventId,
          mid,
          selection.value.id,
        );

        return (
          <div
            key={cellKey}
            className={`relative flex items-center border border-[var(--border-color)] justify-between group/m px-[10px] py-2 text-[12px] rounded-[8px] min-w-0 ${
              bettable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            } ${
              selected
                ? "bg-[var(--primary-color)] text-black"
                : "bg-[var(--sub-element-secondary)]"
            } ${bettable && !isMobile ? " hover:bg-[var(--primary-color)] hover:text-black" : ""}`}
            onClick={() => {
              if (!bettable) return;
              toggleBetslipSelection({
                eventId,
                marketId: mid,
                marketName,
                selection: selection.value,
                apiMarketId: apiMid,
              });
            }}
          >
            <span
              className={`truncate ${
                selected ? "text-black" : "group-hover/m:text-black"
              } mr-2`}
            >
              {getOddName(selection?.value.name)}
            </span>

            <div
              className={`flex items-center justify-center px-[10px] text-[12px] rounded-[8px] ${
                selected
                  ? "text-[var(--text-basic-color)]"
                  : "text-[var(--text-primary-color)] group-hover/m:text-black"
              } shrink-0`}
            >
              {selection?.value.price?.toFixed(2)}
            </div>
            <OddsMoveIndicator mv={selection?.value.mv} />
          </div>
        );
      })}
    </div>
  );
}
