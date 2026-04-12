/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Market as MarketType, Odd } from "@/shared/utils/types";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import {
  handleClickOdd,
  isSelected,
} from "@/app/components/MatchesBoard/components/Match/Market";
import { isMobile } from "@/state/isMobile";

import { storeState } from "@/state/storeState";
import { tOdd } from "@/types/tEvent";
import { Signal } from "@preact/signals";
import { getTranslatedText } from "@/helpers/getTranslate";
import { getOddName, getOnlyNumber } from "@/helpers/getOnlyNumber";

// type MarketWithTick = MarketType & { __tick?: number };

interface MarketProps {
  Collapsed?: boolean;
  marketId: string;
  eventId: number;
}

export const MarketComponent: FunctionComponent<MarketProps> = ({
  Collapsed = false,
  marketId,
  eventId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(Collapsed);

  useEffect(() => {
    setIsCollapsed(Collapsed);
  }, [Collapsed]);

  const event = storeState.value[eventId]?.value;
  const market = event?.markets?.[marketId]?.value;
  const { name, column } = market || {};
  const oddsIdList = market?.odds?.oddIdList || [];
  // const odds = (oddsIdList as string[])
  //   .map((id) => market?.odds?.[id])
  //   .filter(
  //     (o): o is Signal<tOdd> =>
  //       o != null && typeof o === "object" && "value" in o,
  //   )
  //   .map((sig) => sig.value);

  if (market?.status === "deleted") {
    return null;
  }

  // console.log("marketComponentProps", {
  //   Collapsed,
  //   marketId,
  //   eventId,
  // });

  return (
    <div
      key={`market-component-${marketId}-${eventId}`}
      className="flex flex-col w-full rounded-[12px] border bg-[var(--sub-element-color)] text-[var(--text-basic-color)] border-[var(--border-color)]"
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
              <span className="text-[12px]">{getTranslatedText(name)}</span>
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
              gridTemplateColumns: `repeat(${column}, minmax(0, 1fr))`,
            }}
          >
            {oddsIdList.map((oddsId) => {
              const oddSig =
                event?.markets?.[marketId]?.value?.odds?.odds?.[oddsId];
              const odd =
                oddSig && typeof oddSig === "object" && "value" in oddSig
                  ? (oddSig as { value: tOdd }).value
                  : null;

              if (!odd) return null;
              if (odd.status === "suspended") {
                return (
                  <div
                    key={odd.id}
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

              if (odd.status === "deleted") {
                return null;
                // <span
                //   className={`flex items-center border ${theme === "dark" ? "bg-[var(--sub-element-secondary)] border-[var(--border-color)]" : "bg-[var(--sub-element-secondary)] border-[var(--border-color)]"} justify-center px-[10px] py-2  text-[12px] rounded-[8px] text-[var(--text-primary-color)] min-w-0`}
                // >
                //   -
                // </span>
              }

              return (
                <div
                  key={odd.id}
                  className={`relative flex items-center border border-[var(--border-color)] justify-between group/m cursor-pointer px-[10px] py-2 text-[12px] rounded-[8px] min-w-0 ${
                    isSelected(odd.id)
                      ? "bg-[var(--primary-color)] text-black"
                      : "bg-[var(--sub-element-secondary)]"
                  } ${isMobile.value ? "" : " hover:bg-[var(--primary-color)] hover:text-black"}`}
                  onClick={() => {
                    handleClickOdd({
                      eventId: eventId,
                      marketId: marketId,
                      marketName: market?.name || "",
                      participants: event?.participants || [],
                      oddId: odd.id,
                      oddName: getOddName(odd.name) || "",
                      startDate: event?.startDate || 0,
                      sportSlug: event.sport || "",
                    });
                    console.log(odd);
                  }}
                >
                  <span
                    className={`truncate ${
                      isSelected(odd.id)
                        ? "text-black"
                        : "group-hover/m:text-black"
                    } mr-2`}
                  >
                    {getOddName(odd.name)}
                  </span>

                  <div
                    className={`flex items-center justify-center px-[10px] text-[12px] rounded-[8px] ${
                      isSelected(odd.id)
                        ? "text-[var(--text-basic-color)]"
                        : "text-[var(--text-primary-color)] group-hover/m:text-black"
                    } shrink-0`}
                  >
                    {odd.value.toFixed(2)}
                  </div>

                  {odd.mv === 1 && (
                    <span
                      key={`up-${odd.id}`}
                      className="absolute odd-move-mark top-1 right-[2px] w-0 h-0 market-indicator-up"
                      style={{
                        borderStyle: "solid",
                        borderWidth: "0px 8px 8px 0px",
                        borderTopColor: "transparent",
                        borderRightColor: "#16C72E",
                        borderBottomColor: "#000000",
                        borderLeftColor: "transparent",
                        background:
                          "linear-gradient(to top right, #000000 0%, #16C72E 100%)",
                        clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                      }}
                    />
                  )}

                  {odd?.mv === -1 && (
                    <span
                      key={`down-${odd.id}`}
                      className="absolute odd-move-mark bottom-1 right-[2px] w-0 h-0 market-indicator-down"
                      style={{
                        borderStyle: "solid",
                        borderWidth: "0px 0px 8px 8px",
                        borderTopColor: "transparent",
                        borderRightColor: "#000000",
                        borderBottomColor: "#FF3449",
                        borderLeftColor: "transparent",
                        background:
                          "linear-gradient(to top right, #000000 0%, #FF3449 100%)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
