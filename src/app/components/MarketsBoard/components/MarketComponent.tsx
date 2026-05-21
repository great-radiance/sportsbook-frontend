/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Market as MarketType, Odd } from "@/shared/utils/types";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { isBuilding } from "@/state/betState";
import { isMobile } from "@/state/isMobile";

import { storeState } from "@/state/storeState";
import { tOdd } from "@/types/tEvent";
import { Signal } from "@preact/signals";
import { getOddName, getOnlyNumber } from "@/helpers/getOnlyNumber";
import { OddsMoveIndicator } from "@/app/components/OddsMoveIndicator";

// type MarketWithTick = MarketType & { __tick?: number };

interface MarketProps {
  Collapsed?: boolean;
  /**
   * A single market id, or an array of market ids that should be merged into
   * one visual block (used when several backend markets share the same
   * `name` + `type` — e.g. multiple "1st half - total" rows with different
   * handicaps). The first id in the array is treated as the primary; its
   * name / trading-status / column-count drive the header, and selections
   * from all listed markets are concatenated.
   */
  marketId: string | string[];
  eventId: number;
  type: number;
}

export const MarketComponent: FunctionComponent<MarketProps> = ({
  Collapsed = false,
  marketId,
  eventId,
  type,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(Collapsed);

  useEffect(() => {
    setIsCollapsed(Collapsed);
  }, [Collapsed]);

  const event = storeState.value[eventId]?.value;
  const marketIds = Array.isArray(marketId) ? marketId : [marketId];
  const primaryId = marketIds[0];
  const primaryMarket = event?.markets?.[primaryId]?.value;
  const name = primaryMarket?.name;
  const tradingStatus = primaryMarket?.tradingStatus;
  const primarySelections = primaryMarket?.selections ?? [];
  // Concatenate selections across every merged market in the order given,
  // tagging each entry with its origin marketId so React keys stay unique —
  // `tSelectionValue.id` is the canonical selection-type id (e.g. 19 = "Over")
  // and would otherwise collide across merged markets sharing the same name.
  const selectionsRaw =
    marketIds.length === 1
      ? primarySelections.map((sig) => ({ sig, mid: primaryId }))
      : marketIds.flatMap((mid) =>
          (event?.markets?.[mid]?.value.selections ?? [])
            .sort((a, b) => a.value.id - b.value.id)
            .map((sig) => ({
              sig,
              mid,
            })),
        );
  console.log("selectionsRaw", selectionsRaw);
  const selections = isBuilding.value
    ? selectionsRaw.filter(({ sig }) => sig.value.isBetBuilderSupported)
    : selectionsRaw;
  // Use the primary market's selection count for column layout so that
  // each "row" stays paired (e.g. Over | Under) when extras are appended.
  console.log(
    "selectionsMV",
    selections.map(({ sig }) => sig.value.mv),
  );
  const columns = Math.min(
    3,
    Math.max(
      1,
      isBuilding.value ? selections.length || 1 : primarySelections.length,
    ),
  );
  // const odds = (oddsIdList as string[])
  //   .map((id) => market?.odds?.[id])
  //   .filter(
  //     (o): o is Signal<tOdd> =>
  //       o != null && typeof o === "object" && "value" in o,
  //   )
  //   .map((sig) => sig.value);

  if (tradingStatus === 2 || tradingStatus === 3) {
    return null;
  }

  if (isBuilding.value && selections.length === 0) {
    return null;
  }

  // console.log("marketComponentProps", {
  //   Collapsed,
  //   marketId,
  //   eventId,
  // });

  return (
    <div
      key={`market-component-${marketIds.join("_")}-${eventId}`}
      className="flex flex-col w-full rounded-[12px] border bg-[var(--sub-element-color)] text-[var(--text-basic-color)] border-[var(--border-color)]"
      style={{ order: type }}
    >
      <div className={`flex flex-col w-full justify-center rounded-[8px] p-3`}>
        <div
          className={`flex items-center w-full gap-1  ${!isCollapsed && "border-b-[1px] border-[var(--border-color)] pb-2"} `}
        >
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-between w-full cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              {/* <img src={`${BASE_ASSET_PUBLIC_URL}/icons/png`} className="w-[14px] h-[14px]" alt="Favorite" /> */}
              <span className="text-[12px]">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/link.png`}
                className="w-[14px] h-[14px]"
                alt="Link"
              />
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/dollar.png`}
                className="w-[14px] h-[14px]"
                alt="Dollar"
              />
            </div>
          </button>

          {/* <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/stream.png`}
            className="w-[14px] h-[14px]"
            alt="Stream"
            onClick={() => setShowStatistic(!showStatistic)}
          /> */}
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            className={`w-[14px] h-[14px] z-5 transition-transform duration-200 ${
              isCollapsed ? "rotate-90" : "-rotate-90"
            }`}
            alt="Expand/Collapse"
          />
        </div>
        {/* {showStatistic && <Statistic eventId={Number(event.id)} />} */}

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
          {/* unified grid rendering: always use grid columns; if column === odds.length render stacked cells (name above odd), otherwise render side-by-side layout inside each cell */}
          <div
            className="grid w-full gap-2 mt-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {selections.map(({ sig: selection, mid }, index) => {
              if (!selection) return null;
              // Namespace the key by origin marketId so merged markets that
              // share canonical selection ids (e.g. two "Over/Under" rows
              // each carrying selection id 19/20) don't trip Preact's
              // duplicate-key warning.
              const cellKey = `${mid}-${selection.value.id ?? index}`;
              if (selection?.value.status === 1) {
                return (
                  <div
                    key={cellKey}
                    className="flex items-center border bg-[var(--sub-element-secondary)] border-[var(--border-color)] justify-center px-[10px] py-2  text-[12px] rounded-[8px] min-w-0"
                  >
                    <img
                      src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
                      className="w-[16px] h-[16px] brightness-0 invert"
                      alt="lock"
                    />
                  </div>
                );
              }

              if (
                selection?.value.status === 2 ||
                selection?.value.status === 3
              ) {
                // return null;
                return (
                  <span
                    className={`flex items-center border bg-[var(--sub-element-secondary)] border-[var(--border-color)] justify-center px-[10px] py-2  text-[12px] rounded-[8px] text-[var(--text-primary-color)] min-w-0`}
                  >
                    -
                  </span>
                );
              }

              const apiMid =
                event?.markets?.[String(mid)]?.value.id ?? Number(mid);
              const selected = isBetslipSelectionSelected(
                eventId,
                String(mid),
                selection.value.id,
              );

              return (
                <div
                  key={cellKey}
                  className={`relative flex items-center border border-[var(--border-color)] justify-between group/m cursor-pointer px-[10px] py-2 text-[12px] rounded-[8px] min-w-0 ${
                    selected
                      ? "bg-[var(--primary-color)] text-black"
                      : "bg-[var(--sub-element-secondary)]"
                  } ${isMobile.value ? "" : " hover:bg-[var(--primary-color)] hover:text-black"}`}
                  onClick={() => {
                    toggleBetslipSelection({
                      eventId,
                      marketKey: String(mid),
                      marketName: name || "",
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
        </div>
      </div>
    </div>
  );
};
