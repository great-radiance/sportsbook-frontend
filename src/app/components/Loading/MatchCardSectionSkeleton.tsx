import { FunctionComponent } from "preact";

export const MatchCardSectionSkeleton: FunctionComponent = () => {
  const statBoxClasses = [
    "bg-white/10",
    "bg-[var(--text-green)]/20",
    "bg-[var(--text-yellow)]/20",
    "bg-[var(--text-red)]/20",
  ];

  return (
    <div className="flex flex-col w-full gap-2 relative overflow-hidden">
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.06) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 4s ease-in-out infinite",
        }}
      />
      {/* Team 1 row */}
      <div className="flex w-full items-center justify-between relative z-0">
        <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
          <div className="h-[15px] bg-white/10 rounded w-24 max-w-full" />
          <div className="h-3 bg-white/5 rounded w-32" />
        </div>
        <div className="flex gap-1 rounded-[4px] overflow-hidden items-center justify-center shrink-0">
          {statBoxClasses.map((cls, i) => (
            <div key={i} className={`w-5 h-5 rounded-sm ${cls}`} />
          ))}
        </div>
      </div>
      {/* Team 2 row */}
      <div className="flex w-full items-center justify-between relative z-0">
        <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
          <div className="h-[15px] bg-white/10 rounded w-28 max-w-full" />
          <div className="h-3 bg-white/5 rounded w-32" />
        </div>
        <div className="flex gap-1 rounded-[4px] overflow-hidden items-center justify-center shrink-0">
          {statBoxClasses.map((cls, i) => (
            <div key={i} className={`w-5 h-5 rounded-sm ${cls}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
