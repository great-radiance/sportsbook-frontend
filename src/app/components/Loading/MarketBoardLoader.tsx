import { FunctionComponent } from "preact";

const shimmerStyle = {
  background:
    "linear-gradient(90deg, transparent 0%, var(--highlight-background) 25%, var(--highlight-background) 50%, var(--highlight-background) 75%, transparent 100%)",
  backgroundSize: "300% 100%",
  animation: "flow 5s linear infinite",
};

interface MarketBoardLoaderProps {
  marketsCount?: number;
  oddsPerMarket?: number;
  pageName?: string;
}

const EventHeaderSkeleton: FunctionComponent<{
  pageName?: string;
}> = ({ pageName }) => {
  const border = "border-[var(--border-color)]";
  const subBorder = "border-[var(--sub-element-secondary)]";
  const bg = "bg-[var(--sub-element-color)]";
  const headerBg = pageName === "live" ? "" : "bg-[var(--sub-element-color)]";
  const placeholder = "bg-[var(--highlight-background)]";

  return (
    <div
      className={`relative w-full flex flex-col items-center rounded-[8px] pb-2 px-1 overflow-hidden flex-shrink-0 border ${border}`}
    >
      <div
        className={`flex w-full h-[48px] items-center ${headerBg} max-w-[752px] justify-center px-3 relative`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={shimmerStyle}
        />
        <div className="flex items-center gap-2 relative z-0">
          <div className={`w-[20px] h-[20px] ${placeholder} rounded`} />
          <div className={`h-3 ${placeholder} rounded w-32`} />
        </div>
      </div>
      <div
        className={`flex flex-col border ${subBorder} items-center w-full max-w-[752px] ${bg} p-2 rounded-lg gap-2 relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={shimmerStyle}
        />
        <div className="flex w-full flex-col justify-center items-center gap-2 relative z-0">
          {pageName === "live" && (
            <div className={`h-5 w-16 rounded-full ${placeholder} shrink-0`} />
          )}
          <div className="flex w-full justify-center items-center gap-1">
            <div className={`h-3 ${placeholder} rounded flex-1 max-w-[80px]`} />
            <div className={`w-6 h-6 ${placeholder} rounded shrink-0`} />
            <div className={`h-5 w-12 ${placeholder} rounded shrink-0`} />
            <div className={`w-6 h-6 ${placeholder} rounded shrink-0`} />
            <div className={`h-3 ${placeholder} rounded flex-1 max-w-[80px]`} />
          </div>
        </div>
        <div className={`h-3 ${placeholder} rounded w-20 relative z-0`} />
      </div>
    </div>
  );
};

const MarketSkeleton: FunctionComponent<{
  oddsCount?: number;
}> = ({ oddsCount = 3 }) => {
  const bg = "bg-[var(--sub-element-color)]";
  const border = "border-[var(--border-color)]";
  const placeholder = "bg-[var(--highlight-background)]";

  return (
    <div
      className={`flex flex-col w-full rounded-[12px] border ${border} ${bg} relative overflow-hidden`}
    >
      <div className="flex flex-col w-full rounded-[8px] gap-2 p-3">
        <div
          className={`flex items-center justify-between w-full gap-1 rounded-[8px] overflow-hidden border-b-[1px] ${border} p-2 relative`}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={shimmerStyle}
          />
          <div className="flex items-center gap-2 relative z-0">
            <div className={`w-[14px] h-[14px] ${placeholder} rounded`} />
            <div className={`h-3 ${placeholder} rounded w-24`} />
          </div>
          <div className="flex items-center gap-2 relative z-0">
            <div className={`w-[14px] h-[14px] ${placeholder} rounded`} />
            <div className={`w-[14px] h-[14px] ${placeholder} rounded`} />
            <div className={`w-[14px] h-[14px] ${placeholder} rounded`} />
          </div>
        </div>
        <div className="flex w-full gap-[1px] relative z-0">
          {Array.from({ length: oddsCount }).map((_, index) => (
            <div
              key={`odd-${index}`}
              className="flex-1 flex flex-col gap-[1px]"
            >
              <div
                className={`flex items-center justify-center min-h-9 ${placeholder} rounded-[4px]`}
              >
                <div className={`h-3 ${placeholder} rounded w-12`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MarketBoardLoader: FunctionComponent<MarketBoardLoaderProps> = ({
  marketsCount = 4,
  oddsPerMarket = 3,
  pageName,
}) => {
  const tabBg = "bg-[var(--sub-element-color)]";
  const marketsBtnBg = "bg-[var(--highlight-background)]";
  const marketsBtnBorder = "border-[var(--border-color)]";
  const placeholder = "bg-[var(--highlight-background)]";

  return (
    <>
      <EventHeaderSkeleton pageName={pageName} />
      {/* Tablist skeleton - matches MarketsBoard search + tabs row */}
      <div className="flex flex-col gap-[2px] min-w-0">
        <div
          className={`flex items-center gap-0 w-full h-9 rounded-[4px] ${tabBg} overflow-hidden relative`}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={shimmerStyle}
          />
          <div className="flex items-center justify-center w-9 h-9 shrink-0 relative z-0">
            <div className={`w-4 h-4 ${placeholder} rounded`} />
          </div>
          <div className="flex items-center gap-2 flex-1 px-2 relative z-0">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={`tab-${index}`}
                className={`h-6 ${placeholder} rounded w-14 shrink-0`}
              />
            ))}
          </div>
          <div className="flex items-center justify-center w-8 h-9 shrink-0 relative z-0">
            <div className={`w-4 h-4 ${placeholder} rounded`} />
          </div>
        </div>
      </div>

      {/* Markets header button skeleton */}
      <div
        className={`flex ${marketsBtnBg} border ${marketsBtnBorder} items-center min-h-9 px-[10px] py-1 mt-1 rounded-[4px] relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={shimmerStyle}
        />
        <div
          className={`flex flex-1 h-3 ${placeholder} rounded w-20 relative z-0`}
        />
        <div className={`w-4 h-4 ${placeholder} rounded relative z-0 ml-2`} />
      </div>

      {/* Market skeletons */}
      <div className="flex flex-col w-full gap-2 pt-1 pb-4">
        {Array.from({ length: marketsCount }).map((_, index) => (
          <MarketSkeleton key={`market-${index}`} oddsCount={oddsPerMarket} />
        ))}
      </div>
    </>
  );
};
