import { FunctionComponent } from "preact";

interface ComponentLoaderProps {
  sectionsCount?: number;
  className?: string;
}

const SkeletonSection: FunctionComponent = () => {
  return (
    <div className="flex flex-col gap-2 mb-[2px] bg-white/10 rounded-[4px] p-[10px] relative overflow-hidden">
      {/* Flowing white opacity overlay for entire section */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />
      {/* Top bar */}
      <div className="h-4 bg-white/5 rounded w-3/4 relative z-0" />
      {/* Bottom row with alternating bars and squares */}
      <div className="flex items-center gap-2 relative z-0">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index}>
            {index % 2 === 0 ? (
              // Square
              <div className="w-8 h-8 bg-white/5 rounded" />
            ) : (
              // Bar
              <div className="h-6 bg-white/5 rounded w-16" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ComponentLoader: FunctionComponent<ComponentLoaderProps> = ({
  sectionsCount = 10,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col w-full bg-[var(--background-color)] rounded-[4px] p-[10px] gap-[2px] ${className}`}
    >
      {/*  */}
      {/* Repeat skeleton sections */}
      {Array.from({ length: sectionsCount }).map((_, index) => (
        <SkeletonSection key={index} />
      ))}
    </div>
  );
};

interface ResultMatchesLoaderProps {
  matchesCount?: number;
}

const ResultMatchSkeleton: FunctionComponent = () => {
  return (
    <div className="flex flex-col w-full text-white/90 cursor-pointer relative overflow-hidden">
      {/* Flowing white opacity overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />

      {/* League Header */}
      <div className="flex w-full h-[34px] px-[7px] items-center bg-white/15 gap-2 rounded-[4px] relative z-0">
        <div className="w-[14px] h-[14px] bg-white/5 rounded-[4px]" />
        <div className="h-3 bg-white/5 rounded w-48" />
        <div className="w-[20px] h-[20px] bg-white/5 rounded ml-auto" />
      </div>

      {/* Expanded Match Details (always shown in skeleton) */}
      <div className="flex flex-col w-full p-[6px] bg-white/5 rounded-[4px] relative z-0">
        <div className="flex flex-col w-full rounded-[4px] p-1 overflow-hidden bg-white/10">
          <div className="flex w-full py-[2px] items-center justify-between px-[7px] gap-2">
            <div className="h-3 bg-white/5 rounded w-32" />
            <div className="h-3 bg-white/5 rounded w-6" />
          </div>
          <div className="flex w-full py-[2px] items-center justify-between px-[7px] gap-2">
            <div className="h-3 bg-white/5 rounded w-36" />
            <div className="h-3 bg-white/5 rounded w-6" />
          </div>
          <div className="flex w-full py-[2px] items-center px-[7px] gap-2">
            <div className="h-3 bg-white/5 rounded w-24" />
          </div>
          <div className="w-full my-[2px] h-[1px] bg-[var(--background-color)]"></div>
          <div className="flex w-full mt-[1px] items-center px-[7px] gap-2">
            <div className="w-[14px] h-[14px] bg-white/5 rounded" />
            <div className="h-3 bg-white/5 rounded w-12" />
            <div className="w-[0px] h-[14px] border-l-[1px] border-[var(--background-color)]"></div>
            <div className="h-3 bg-white/5 rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResultMatchesLoader: FunctionComponent<
  ResultMatchesLoaderProps
> = ({ matchesCount = 5 }) => {
  return (
    <div className="flex flex-col w-full min-h-0 gap-1 py-2 overflow-hidden overflow-y-auto">
      {Array.from({ length: matchesCount }).map((_, index) => (
        <ResultMatchSkeleton key={index} />
      ))}
    </div>
  );
};

interface ResultMarketComponentLoaderProps {
  marketsCount?: number;
}

const MarketSkeleton: FunctionComponent = () => {
  return (
    <div className="flex flex-col w-full px-[10px] rounded-[4px] gap-[1px] py-1 relative overflow-hidden">
      {/* Flowing white opacity overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />

      {/* Market Header */}
      <div className="flex w-full rounded-[4px] p-[10px] items-center cursor-pointer justify-between bg-white/10 relative z-0">
        <div className="h-3 bg-white/5 rounded w-40" />
        <div className="w-[20px] h-[20px] bg-white/5 rounded" />
      </div>
    </div>
  );
};

export const ResultMarketComponentLoader: FunctionComponent<
  ResultMarketComponentLoaderProps
> = ({ marketsCount = 6 }) => {
  return (
    <div className="flex flex-col w-full min-h-0 overflow-hidden overflow-y-auto">
      {/* Match Header Skeleton */}
      <div className="flex flex-col w-full pl-3 pr-1 py-2 gap-2 text-white/90 relative overflow-hidden">
        <div className="flex flex-col w-full p-[10px] bg-black/30 rounded-[4px] relative z-0">
          <div
            className="absolute inset-0 pointer-events-none rounded-[4px]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
              backgroundSize: "300% 100%",
              animation: "flow 5s linear infinite",
            }}
          />
          <div className="flex w-full items-center justify-between relative z-0">
            <div className="h-3 bg-white/5 rounded w-32" />
            <div className="h-3 bg-white/5 rounded w-6" />
          </div>
          <div className="flex w-full items-center justify-between relative z-0 mt-2">
            <div className="h-4 bg-white/5 rounded w-40" />
            <div className="h-4 bg-white/5 rounded w-6" />
          </div>
          <div className="flex w-full items-center relative z-0 mt-2">
            <div className="h-3 bg-white/5 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Market Skeletons */}
      {Array.from({ length: marketsCount }).map((_, index) => (
        <MarketSkeleton key={index} />
      ))}
    </div>
  );
};
