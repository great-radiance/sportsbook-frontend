import { FunctionComponent } from "preact";

interface MatchesBoardLoaderProps {
  dailyMatchesCount?: number;
  matchesPerDay?: number;
}

interface DailyMatchesSkeletonProps {
  matchesCount?: number;
}

const DailyMatchesSkeleton: FunctionComponent<DailyMatchesSkeletonProps> = ({
  matchesCount = 3,
}) => {
  return (
    <div className="flex flex-col gap-[2px] mt-[2px] w-full">
      {/* DailyMatches header skeleton */}
      <div className="flex items-center w-full h-9 px-[10px] rounded-[4px] bg-white/5">
        <div className="flex-1 h-4 bg-white/10 rounded w-24 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
              backgroundSize: "300% 100%",
              animation: "flow 5s linear infinite",
            }}
          />
        </div>
        <div className="w-[24px] h-[24px] bg-white/10 rounded relative overflow-hidden ml-2">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
              backgroundSize: "300% 100%",
              animation: "flow 5s linear infinite",
            }}
          />
        </div>
      </div>
      {/* Match component loaders */}
      {Array.from({ length: matchesCount }).map((_, matchIndex) => (
        <div
          key={`match-${matchIndex}`}
          className="flex w-full cursor-pointer h-[54px] py-[10px] pr-[5px] pl-[10px] rounded-[4px] bg-white/15 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
              backgroundSize: "300% 100%",
              animation: "flow 5s linear infinite",
            }}
          />
          <div className="flex flex-1 pr-2 min-w-0 relative z-0">
            <div className="flex flex-col flex-1 min-w-0 gap-2">
              <div className="h-3 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-3 bg-white/5 rounded w-8" />
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-white/5 rounded" />
                <div className="w-3 h-3 bg-white/5 rounded" />
                <div className="w-3 h-3 bg-white/5 rounded" />
              </div>
            </div>
          </div>
          {/* Two market areas: WINNER and TOTALS */}
          <div className="flex gap-2 relative z-0">
            {/* WINNER market skeleton (3 columns) */}
            <div className="flex gap-[2px]">
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
            </div>
            {/* TOTALS market skeleton (3 columns: total line, OVER, UNDER) */}
            <div className="flex gap-[2px]">
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
              <div className="w-[50px] h-[34px] bg-white/5 rounded" />
            </div>
          </div>
          <div className="flex w-[50px] ml-[5px] items-center justify-end relative z-0">
            <div className="h-4 bg-white/5 rounded w-8" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MatchesBoardLoader: FunctionComponent<MatchesBoardLoaderProps> = ({
  dailyMatchesCount = 2,
  matchesPerDay = 3,
}) => {
  return (
    <>
      {Array.from({ length: dailyMatchesCount }).map((_, dailyIndex) => (
        <DailyMatchesSkeleton
          key={`daily-${dailyIndex}`}
          matchesCount={matchesPerDay}
        />
      ))}
    </>
  );
};
