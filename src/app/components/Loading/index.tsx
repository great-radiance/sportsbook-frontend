import { FunctionComponent } from "preact";

interface UpcomingMatchesLoaderProps {
  matchesCount?: number;
  theme?: "light" | "dark";
}

export const UpcomingMatchSkeleton: FunctionComponent = () => {
  return (
    <div className="flex w-full min-h-[85px] bg-[var(--highlight-background)] border border-[var(--border-color)] rounded-[4px] overflow-hidden items-center relative">
      {/* Flowing white opacity overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--highlight-background) 25%, var(--highlight-background) 50%, var(--highlight-background) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />
      {/* Left section: Clock icon and time */}
      <div className="flex flex-col justify-center gap-2 w-[70px] p-[5px] h-full relative z-0">
        {/* <div className="w-[14px] h-[14px] bg-[var(--highlight-background-dark)] rounded" /> */}
        <div className="h-3 bg-[var(--highlight-background)] rounded w-12" />
        <div className="h-3 bg-[var(--highlight-background)] rounded w-10" />
      </div>
      {/* <div className="flex w-[1px] h-[calc(100%-20px)] relative z-0" /> */}
      {/* Middle section: Team names and icons */}
      <div className="flex flex-1 items-center py-4 px-3 h-full min-w-0 relative z-0">
        <div className="flex flex-col flex-1 min-w-0 pr-2 gap-1">
          <div className="h-3 bg-[var(--highlight-background)] rounded w-3/4" />
          <div className="h-3 bg-[var(--highlight-background)] rounded w-2/3" />
        </div>
        {/* <div className="flex flex-col items-end justify-center gap-1">
          <div className="h-3 bg-[var(--highlight-background-dark)] rounded w-8" />
          <div className="flex items-center gap-2">
            <div className="w-[11px] h-[11px] bg-[var(--highlight-background-dark)] rounded" />
            <div className="w-[11px] h-[11px] bg-[var(--highlight-background-dark)] rounded" />
          </div>
        </div> */}
      </div>
      {/* Right section: Market odds (3 columns) */}
      <div className="flex flex-1 shrink-0 h-[34px] gap-[1px] relative z-0">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex-1 bg-[var(--highlight-background)] h-full rounded-[4px] flex items-center justify-center"
          >
            <div className="h-4 bg-[var(--highlight-background)] rounded w-10" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const UpcomingMatchesLoader: FunctionComponent<
  UpcomingMatchesLoaderProps
> = ({ matchesCount = 4, theme = "dark" }) => {
  return (
    <div
      className={`flex flex-col w-full rounded-lg py-2 ${theme === "light" && "bg-[var(--sub-element-secondary)]"} md:px-2 md:py-2 min-h-0`}
    >
      {/* Market selector skeleton */}
      <div className="flex w-full rounded-[4px] h-[28px] gap-[2px] items-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--highlight-background) 25%, var(--highlight-background) 50%, var(--highlight-background) 75%, transparent 100%)",
            backgroundSize: "300% 100%",
            animation: "flow 5s linear infinite",
          }}
        />
        <div className="bg-white/15 h-[28px] w-24 rounded-l-[4px] relative z-0" />
        <div className="flex w-full rounded-r-[4px] overflow-hidden h-full bg-white/15 gap-[2px] items-center justify-end relative z-0">
          <div className="flex w-[165px] h-full gap-[1px]">
            {[1, 2, 3].map((index) => (
              <div
                key={`header-${index}`}
                className="flex text-[11px] w-full h-full bg-white/20 items-center justify-center"
              >
                <div className="h-3 bg-white/5 rounded w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matches list skeleton */}
      <div className="flex flex-col w-full gap-[2px] mt-1">
        {Array.from({ length: matchesCount }).map((_, index) => (
          <UpcomingMatchSkeleton key={`match-${index}`} />
        ))}
      </div>
    </div>
  );
};

// interface MiniMatchLoaderProps {
//   matchesCount?: number;
// }

// const MiniMatchSkeleton: FunctionComponent = () => {
//   return (
//     <div className="flex flex-col w-full max-w-[300px] gap-1 rounded-[4px] bg-white/10 h-full p-1 pb-2 relative overflow-hidden">
//       {/* Flowing white opacity overlay */}
//       <div
//         className="absolute inset-0 pointer-events-none"
//         style={{
//           background:
//             "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
//           backgroundSize: "300% 100%",
//           animation: "flow 5s linear infinite",
//         }}
//       />

//       {/* Top section */}
//       <div className="flex w-full h-full relative z-0">
//         {/* Left side: Team names, status */}
//         <div className="flex flex-col items-start justify-center w-full h-full gap-1 relative z-0">
//           <div className="h-3 bg-white/5 rounded w-32" />
//           <div className="h-3 bg-white/5 rounded w-36" />
//           <div className="h-3 bg-white/5 rounded w-20" />
//           <div className="flex gap-1">
//             <div className="h-3 bg-white/5 rounded w-16" />
//             <div className="h-3 bg-white/5 rounded w-8" />
//           </div>
//         </div>

//         {/* Right side: Scores, icons, time */}
//         <div className="flex flex-col items-end justify-center w-full h-full gap-1 relative z-0">
//           <div className="h-3 bg-white/5 rounded w-4" />
//           <div className="h-3 bg-white/5 rounded w-4" />
//           <div className="flex gap-1 items-center justify-end">
//             <div className="w-[14px] h-[14px] bg-white/5 rounded" />
//             <div className="h-3 bg-white/5 rounded w-8" />
//             <div className="w-[14px] h-[14px] bg-white/5 rounded" />
//           </div>
//           <div className="h-3 bg-white/5 rounded w-10" />
//         </div>
//       </div>

//       {/* Bottom section: Market odds (3 columns) */}
//       <div className="flex w-full h-full gap-[2px] relative z-0">
//         {[1, 2, 3].map((index) => (
//           <div
//             key={index}
//             className={`flex w-full h-full bg-white/15 px-2 py-1 justify-between items-center ${index === 1 ? "rounded-l-[4px]" : ""} ${index === 3 ? "rounded-r-[4px]" : ""}`}
//           >
//             <div className="h-3 bg-white/5 rounded w-6" />
//             <div className="h-3 bg-white/5 rounded w-8" />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export const MiniMatchLoader: FunctionComponent<MiniMatchLoaderProps> = ({
//   matchesCount = 3,
// }) => {
//   return (
//     <div className="flex flex-col w-full gap-1">
//       {Array.from({ length: matchesCount }).map((_, index) => (
//         <MiniMatchSkeleton key={index} />
//       ))}
//     </div>
//   );
// };

export const SportsListLoader: FunctionComponent<{ sportsCount?: number }> = ({
  sportsCount = 5,
}) => {
  return (
    <div className="relative -z-1 flex w-full py-[10px] gap-0 items-center">
      {/* Scrollable Container */}
      <div
        className="flex gap-[6px] overflow-x-auto pt-[4px] flex-1 min-w-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {Array.from({ length: sportsCount }).map((_, index) => (
          <div
            key={index}
            className="relative flex shrink-0 rounded-full px-2 py-1 gap-1 items-center justify-center overflow-hidden bg-[var(--highlight-background-dark)] min-w-0"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--highlight-background-dark) 25%, var(--highlight-background) 50%, var(--highlight-background-dark) 75%, transparent 100%)",
                backgroundSize: "300% 100%",
                animation: "flow 5s linear infinite",
              }}
            />
            {/* Icon placeholder */}
            <div className="w-[28px] h-[24px] bg-[var(--highlight-background)] rounded relative z-0 shrink-0" />
            {/* Sport name placeholder */}
            <div className="h-3 bg-[var(--highlight-background)] rounded w-12 relative z-0 min-w-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const LiveMatchesPanelLoader: FunctionComponent<{
  showMarketTabs?: boolean;
}> = ({ showMarketTabs = false }) => {
  const shimmerStyle = {
    background:
      "linear-gradient(90deg, transparent 0%, var(--highlight-background) 25%, var(--highlight-background) 50%, var(--highlight-background) 75%, transparent 100%)",
    backgroundSize: "300% 100%",
    animation: "flow 5s linear infinite",
  };

  return (
    <>
      {showMarketTabs && (
        <div className="flex w-full rounded-[4px] px-2 gap-[2px] items-center mb-[10px]">
          <nav className="flex gap-6 w-full px-4 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="relative h-8 min-w-[60px] rounded overflow-hidden"
              >
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={shimmerStyle}
                />
                <div className="h-4 bg-[var(--highlight-background)] rounded w-14 relative z-0" />
              </div>
            ))}
          </nav>
        </div>
      )}
      <div className="flex flex-col mt-1 rounded-[4px]">
        {[1, 2, 3].map((blockIndex) => (
          <div key={blockIndex} className="flex flex-col px-[5px]">
            {/* Region - League header */}
            <div className="flex items-center h-[34px] justify-start py-2 w-full">
              <div className="flex items-center text-[12px] px-2 pb-1 pt-2 gap-2 flex-1 min-w-0">
                <div className="w-[16px] h-[16px] bg-[var(--highlight-background)] rounded shrink-0" />
                <div className="h-3 flex-1 max-w-[180px] bg-[var(--highlight-background)] rounded relative overflow-hidden">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={shimmerStyle}
                  />
                </div>
              </div>
            </div>
            {/* Match rows */}
            <div className="flex flex-col w-full gap-[2px] py-[2px]">
              {[1, 2].map((matchIndex) => (
                <div
                  key={matchIndex}
                  className="flex items-center w-full min-h-[56px] rounded-[4px] overflow-hidden relative bg-[var(--sub-element-secondary-dark)]"
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={shimmerStyle}
                  />
                  <div className="flex flex-1 min-w-0 px-2 py-2 gap-2 relative z-0">
                    <div className="flex flex-col flex-1 gap-1">
                      <div className="h-3 bg-[var(--highlight-background)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--highlight-background)] rounded w-2/3" />
                    </div>
                  </div>
                  <div className="flex flex-1 gap-[2px] px-2 relative z-0">
                    {[1, 2, 3].map((o) => (
                      <div
                        key={o}
                        className="w-full h-[34px] bg-[var(--highlight-background)] rounded-[4px]"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const MiniMatchLoader: FunctionComponent = () => {
  return (
    <div className="flex w-full h-full flex-col gap-2 bg-[var(--highlight-background)] p-4 relative overflow-hidden rounded-[8px]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--sub-element-secondary) 25%, var(--sub-element-secondary) 50%, var(--sub-element-secondary) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />
      {/* Top row: left (time + teams) + right (scores) */}
      <div className="flex w-full flex-1 min-h-0 justify-between items-stretch gap-2 relative z-0">
        <div className="flex flex-col items-start justify-center gap-1 flex-1 min-w-0">
          <div className="h-3 bg-[var(--highlight-background)] rounded w-10 mb-2" />
          <div className="h-3 bg-[var(--highlight-background)] rounded w-full max-w-[120px]" />
          <div className="h-3 bg-[var(--highlight-background)] rounded w-full max-w-[100px]" />
        </div>
        <div className="flex flex-col items-end justify-center gap-1 shrink-0">
          <div className="w-[14px] h-[14px] bg-[var(--highlight-background)] rounded" />
          <div className="h-3 bg-[var(--highlight-background)] rounded w-4" />
          <div className="h-3 bg-[var(--highlight-background)] rounded w-4" />
        </div>
      </div>
      {/* Bottom: odds rows */}
      <div className="flex w-full gap-2 relative z-0">
        {[1, 2, 3].map((_, i) => (
          <div
            key={i}
            className="flex flex-1 bg-[var(--highlight-background)] rounded-lg px-2 h-[36px] justify-between items-center"
          >
            <div className="h-3 bg-[var(--highlight-background)] rounded w-6" />
            <div className="h-3 bg-[var(--highlight-background)] rounded w-8" />
          </div>
        ))}
      </div>
    </div>
  );
};
