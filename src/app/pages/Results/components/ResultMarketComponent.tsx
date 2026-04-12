import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { Market, Odd } from "@/shared/utils/types";
import { isMobile } from "@/state/isMobile";
import { useTranslate } from "@/shared/i18n/i18n";
import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";

interface ResultMarketComponentProps {
  match: any;
  onClick: () => void;
}

export const ResultMarketComponent: FunctionComponent<
  ResultMarketComponentProps
> = ({ match, onClick }) => {
  const { t: tCommon } = useTranslate("common");
  const { t: tResults } = useTranslate("results");
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set(),
  );
  const results = match?.results;
  let markets = match?.markets || [];
  markets = markets?.filter((market: Market) => {
    return (
      market?.odds?.filter((odd: Odd) => results?.[odd?.properties?.uuid] === 1)
        .length > 0
    );
  });
  if (
    results === null ||
    results === undefined ||
    results?.length === 0 ||
    markets?.length === 0
  )
    return (
      <div className="bg-[var(--sub-element-color)] flex w-full h-[50vh] items-center justify-center">
        {isMobile.value && (
          <div
            className="fixed bg-[var(--background-color)] top-[60px] left-0 flex gap-2 px-[10px] py-[5px] items-center justify-start w-full"
            onClick={onClick}
          >
            <div className="bg-white/60 rounded-full">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                className="rotate-180 brightness-0 w-[20px]"
              />
            </div>
            <span className="text-[14px] font-medium">
              {match?.fixture?.sport?.name || tCommon("back")}
            </span>
          </div>
        )}
        <span className="text-[14px]">{tResults("noResults")}</span>
      </div>
    );

  return (
    <div className="flex flex-col w-full min-h-0 overflow-auto relative">
      {isMobile.value && (
        <div
          className="sticky top-[20px] bg-[var(--background-color)] left-0 flex gap-2 px-[10px] py-[5px] items-center justify-start w-full"
          onClick={onClick}
        >
          <div className="bg-white/60 rounded-full">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              className="rotate-180 brightness-0 w-[20px]"
            />
          </div>
          <span className="text-[14px] font-medium">
            {match?.fixture?.sport?.name}
          </span>
        </div>
      )}
      <div className="flex flex-col mt-[40px] w-full pl-3 pr-1 py-2 gap-2">
        <div className="flex flex-col w-full p-[10px] bg-black/30 rounded-[4px]">
          <div className="flex w-full items-center justify-between">
            <span className="text-[12px] font-medium">
              {match?.fixture?.participants?.[0]?.name ||
                match?.fixture?.participants?.[0]?.providerName}
            </span>
            <span className="text-[12px] text-[var(--primary-color)] font-medium">
              {match?.live?.scoreBoard?.goals?.h || 0}
            </span>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-[14px] font-medium">
              {match?.fixture?.participants?.[1]?.name ||
                match?.fixture?.participants?.[1]?.providerName}
            </span>
            <span className="text-[14px] font-medium text-[var(--primary-color)]">
              {match?.live?.scoreBoard?.goals?.g || 0}
            </span>
          </div>
          <span className="text-[11px]">
            {match?.live?.scoreBoard?.goals?.h || 0} :{" "}
            {match?.live?.scoreBoard?.goals?.g || 0} (
            {match?.live?.scoreBoard?.half?.h || 0} :{" "}
            {match?.live?.scoreBoard?.half?.g || 0})
          </span>
        </div>
      </div>

      {markets?.map((market: Market) => {
        const marketId = market.marketId;
        const isExpanded = expandedMarkets.has(marketId);

        return (
          <div
            key={marketId}
            className="flex flex-col w-full px-[10px] rounded-[4px] gap-[1px] py-1"
          >
            <div className="flex w-full bg-[var(--sub-element-color)]">
              <div
                className="flex w-full rounded-[4px] p-[10px] items-center cursor-pointer justify-between bg-white/10"
                onClick={() => {
                  setExpandedMarkets((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(marketId)) {
                      newSet.delete(marketId);
                    } else {
                      newSet.add(marketId);
                    }
                    return newSet;
                  });
                }}
              >
                <span className="text-[12px] font-medium">{market.name}</span>
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                  className={`w-[20px] h-[20px] transition-transform ${isExpanded ? "-rotate-90" : "rotate-90"}`}
                />
              </div>
            </div>
            <div className="flex w-full gap-[2px]">
              {isExpanded && market?.odds && (
                <div className="flex flex-col gap-[2px] w-full">
                  {market.odds
                    .filter((odd: Odd) => results?.[odd.properties?.uuid] === 1)
                    .sort((a: Odd, b: Odd) => a.name.localeCompare(b.name))
                    .map((odd: Odd) => (
                      <div className="flex flex-col w-full bg-[var(--sub-element-color)]">
                        <div
                          key={odd.properties?.uuid}
                          className="flex flex-col w-full p-[10px] bg-white/5 rounded-[4px]"
                        >
                          <span className="text-[12px]">{odd.name}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
