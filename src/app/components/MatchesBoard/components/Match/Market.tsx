import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { isMobile } from "@/state/isMobile";
import { storeState } from "@/state/storeState";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { isBuilding } from "@/state/betState";

interface MarketProps {
  marketId: number;
  isHightFull?: boolean;
  eventId: number;
  single?: boolean;
}

// export const handleClickOdd = ({
//   selectionId,
//   selectionName,
//   eventId,
//   marketId,
//   marketName,
//   participants,
//   startDate,
//   sportSlug,
// }: {
//   selectionId: number;
//   selectionName: string;
//   eventId: number;
//   marketId: number;
//   marketName: string;
//   participants: tParticipant[];
//   startDate: number;
//   sportSlug: string;
// }) => {
//   // Safety: ensure selectedselections.value is always treated like an array
//   const current = Array.isArray(selectedselections.value)
//     ? selectedselections.value
//     : [];
//   console.log("handleClickselectionProps", {
//     selectionId,
//     selectionName,
//     eventId,
//     marketId,
//     marketName,
//     participants,
//     startDate,
//     sportSlug,
//   });

//   // --- BetBuilder building constraint: only selections from same event can be combined
//   if (isBuilding.value) {
//     const buildingselections = current.filter((o) => o.isBuilding);
//     if (
//       buildingselections.length > 0 &&
//       buildingselections[0]?.eventId !== eventId
//     ) {
//       notify("cannot be combined", "warning");
//       return;
//     }
//   }

//   const handleDeselectselection = (selectionsId: string) => {
//     // remove from selections store + remove from selections
//     removeFromOddsStore([selectionsId]);
//     selectedselections.value = (
//       Array.isArray(selectedselections.value) ? selectedselections.value : []
//     ).filter((o) => o.selectionsId !== selectionsId);
//   };

//   const handleSelectselection = (
//     selectionId: number,
//     selectionName: string,
//   ) => {
//     let next = Array.isArray(selectedselections.value)
//       ? [...selectedOdds.value]
//       : [];

//     // 1) single/betbuilder: only one selection per (eventId, marketId)
//     if (
//       selectedBetType.value !== "multi" &&
//       selectedBetType.value !== "system"
//     ) {
//       const toRemoveIds = next
//         .filter((o) => o.eventId === eventId && o.marketId === marketId)
//         .map((o) => o.oddsId);

//       if (toRemoveIds.length) {
//         removeFromOddsStore(toRemoveIds);
//         next = next.filter(
//           (o) => !(o.eventId === eventId && o.marketId === marketId),
//         );
//       }
//     }

//     // 2) multi/system: only one NON-building selection per event
//     if (
//       selectedBetType.value === "multi" ||
//       selectedBetType.value === "system"
//     ) {
//       const nonBuildingOdds = next.filter((o) => !o.isBuilding);

//       // if event already exists among non-building odds, replace it
//       if (nonBuildingOdds.some((o) => o.eventId === eventId)) {
//         const toRemoveIds = nonBuildingOdds
//           .filter((o) => o.eventId === eventId)
//           .map((o) => o.oddsId);

//         removeFromOddsStore(toRemoveIds);
//         next = next.filter((o) => o.isBuilding || o.eventId !== eventId);
//       } else if (
//         // system: max 2 odds from same sport (so if already 2, block)
//         selectedBetType.value === "system" &&
//         nonBuildingOdds.filter((o) => o.sportSlug === sportSlug).length > 1
//       ) {
//         notify("same sport bets cannot be combined for systembet", "warning");
//         return;
//       }
//     }

//     // 3) add selection
//     const eventSig = storeState.value[eventId];
//     next = [
//       ...next,
//       {
//         oddsId: newOddId || "",
//         name: newOddName,
//         marketId,
//         marketName,
//         participants,
//         startDate,
//         sportSlug,
//         amount: 0,
//         eventId,
//         isBuilding: isBuilding.value,
//         selectedBank: false,
//         sport: eventSig?.value?.sport || "",
//         region: eventSig?.value?.region || "",
//         league: eventSig?.value?.league || "",
//       },
//     ];

//     selectedOdds.value = next;
//     storeSelection(eventId, marketId, newOddId);
//   };

//   // Toggle
//   if (isSelected(oddId)) {
//     handleDeselectOdd(oddId || "");
//   } else {
//     handleSelectOdd(oddId, oddName);
//   }
// };

export const Market: FunctionComponent<MarketProps> = ({
  marketId,
  isHightFull = false,
  eventId,
  single = false,
}) => {
  const evSig = storeState.value[eventId];
  const event = evSig?.value;
  const marketKey = String(marketId);

  const market = event?.markets?.[marketKey]?.value;
  const tradingStatus = market?.tradingStatus;
  const name = market?.name;
  const lowerName = name?.toLowerCase() || "";

  if (isBuilding.value && !market?.isBetBuilderSupported) {
    return null;
  }

  const selectionsAll = market?.selections ?? [];
  const selections = isBuilding.value
    ? selectionsAll.filter((s) => s.value.isBetBuilderSupported)
    : selectionsAll;

  if (isBuilding.value && selections.length === 0) {
    return null;
  }

  const column = selections.length;

  // const labels = {
  //   winner: ["1", "X", "2"],
  //   total: ["OVER", "UNDER"],
  //   handicap: ["HOME", "AWAY"],
  //   winnerTwo: ["1", "2"],
  // };

  const marketLabel =
    lowerName.includes("match result") || lowerName.includes("winner")
      ? column === 3
        ? "winner"
        : column === 2
          ? "winnerTwo"
          : undefined
      : lowerName.includes("total goals") &&
          lowerName.includes("over/under") &&
          column === 2
        ? "total"
        : lowerName.includes("handicap") && !lowerName.includes("3")
          ? "handicap"
          : undefined;

  if (tradingStatus === 2 || tradingStatus === 3) {
    return (
      <div
        className={`flex w-full gap-[2px] ${isMobile.value ? "h-full" : "h-[34px]"}`}
      >
        <div className="flex w-full h-full bg-[var(--sub-element-secondary)] border border-[var(--border-color)] items-center justify-center rounded-[8px]">
          <span className="text-[var(--text-sub-color)] text-[12px]">
            markets not available
          </span>
        </div>
      </div>
    );
  }

  // if (single) {
  return (
    <>
      <div
        className={`flex w-full font-bold text-[14px] gap-2 overflow-hidden ${isHightFull ? "h-full" : "h-[36px]"}`}
      >
        {selections.map((selection, index) => {
          const selectionName = selection?.value.name;
          const selectionId = selection?.value.id;
          const isSuspended =
            selection?.value.status === 1 || tradingStatus === 1;
          const isClosed =
            selection?.value.status === 2 || selection?.value.status === 3;

          if (isClosed) {
            return (
              <div
                key={selectionId}
                className="flex items-center justify-center px-3 flex-1 rounded-[8px] h-[34px] text-[var(--text-basic-color)] bg-[var(--sub-element-secondary)] border border-[var(--border-color)]"
              >
                <span className="text-[12px]">-</span>
              </div>
            );
          }

          if (isSuspended) {
            return (
              <div
                key={selectionId}
                className="flex w-full items-center justify-center px-3 flex-1 rounded-[8px] h-[34px] text-[var(--text-basic-color)] bg-[var(--sub-element-secondary)] border border-[var(--border-color)]"
              >
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/lock.png`}
                  className="w-[16px] max-w-[16px] max-h-[16px] brightness-0 invert"
                  alt="lock"
                />
              </div>
            );
          }

          const selected = isBetslipSelectionSelected(
            eventId,
            marketKey,
            selectionId as number,
          );

          return (
            <div
              key={selectionId}
              className={`relative flex-1 min-w-0 px-2 py-3 group rounded-[8px] flex items-center justify-between cursor-pointer ${
                isMobile.value
                  ? ""
                  : "hover:bg-[var(--primary-color)] hover:text-white"
              } ${index > 0 ? "transition-colors" : ""} ${
                selected
                  ? "bg-[var(--primary-color)] text-white/90"
                  : "text-[var(--text-basic-color)] bg-[var(--sub-element-secondary)] border border-[var(--border-color)] group-hover:text-white"
              }`}
              onClick={() => {
                if (selectionId == null || !selection?.value) return;
                toggleBetslipSelection({
                  eventId,
                  marketKey,
                  marketName: name ?? "",
                  selection: selection.value,
                  apiMarketId: market?.id ?? Number(marketId),
                });
              }}
            >
              <span
                className={`min-w-0 truncate text-ellipsis overflow-hidden  ${
                  selected ? "text-white" : "  group-hover:text-white"
                }`}
              >
                {selectionName}
              </span>
              <span
                className={`flex ${
                  selected
                    ? ""
                    : "group-hover:text-white text-[var(--text-primary-color)] "
                }`}
              >
                {selection?.value.price?.toFixed(2) || "-"}
              </span>
              {/* {odd?.mv === 1 && (
                <span className="absolute odd-move-mark top-1 right-[2px] w-0 h-0 market-indicator-up border-solid border-t-0 border-r-[8px] border-b-[8px] border-l-0 border-t-transparent border-r-[#16C72E] border-b-[#000000] border-l-transparent bg-[linear-gradient(to_top_right,_#000000_0%,_#16C72E_100%)] [clip-path:polygon(0_0,_100%_0,_100%_100%)]" />
              )}
              {odd?.mv === -1 && (
                <span className="absolute odd-move-mark bottom-1 right-[2px] w-0 h-0 market-indicator-down border-solid border-b-[8px] border-l-[8px] border-t-0 border-r-0 border-b-[#FF3449] border-l-transparent border-t-transparent border-r-[#000000] bg-[linear-gradient(to_top_right,_#000000_0%,_#FF3449_100%)]" />
              )} */}
            </div>
          );
        })}
      </div>
    </>
  );
};
