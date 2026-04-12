import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

interface PrematchLoaderProps {
  sportsCount?: number;
  regionsPerSport?: number;
  competitionsPerRegion?: number;
}

const CompetitionSkeleton: FunctionComponent = () => {
  return (
    <div className="flex items-center justify-between px-[10px] py-1.5 rounded-[4px] bg-white/10 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
          backgroundSize: "300% 100%",
          animation: "flow 5s linear infinite",
        }}
      />
      <div className="h-3 bg-white/5 rounded w-3/4 relative z-0" />
      <div className="h-3 bg-white/5 rounded w-8 relative z-0" />
    </div>
  );
};

const RegionSkeleton: FunctionComponent<{ competitionsCount?: number }> = ({
  competitionsCount = 2,
}) => {
  return (
    <div
      className="flex flex-col px-[5px] pb-[5px]"
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)" }}
    >
      {/* Location header skeleton */}
      <div className="flex items-center h-[34px] justify-between py-2 rounded-[4px] w-full relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
            backgroundSize: "300% 100%",
            animation: "flow 5s linear infinite",
          }}
        />
        <div className="flex items-center gap-2 flex-1 relative z-0">
          {/* Flag placeholder */}
          <div className="w-[18px] h-[12px] bg-white/5 rounded" />
          {/* Name placeholder */}
          <div className="h-3 bg-white/5 rounded w-24" />
          {/* Count placeholder */}
          <div className="h-3 bg-white/5 rounded w-6 ml-auto" />
        </div>
        {/* Arrow placeholder */}
        <div className="w-[24px] h-[24px] bg-white/5 rounded relative z-0 ml-2" />
      </div>
      {/* Competitions skeleton */}
      <div className="flex flex-col gap-[2px] bg-[var(--background-color)] p-[2px] rounded-[4px] mt-1">
        {Array.from({ length: competitionsCount }).map((_, index) => (
          <CompetitionSkeleton key={`competition-${index}`} />
        ))}
      </div>
    </div>
  );
};

const SportSkeleton: FunctionComponent<{
  regionsCount?: number;
  competitionsPerRegion?: number;
}> = ({ regionsCount = 5, competitionsPerRegion = 2 }) => {
  return (
    <div className="flex flex-col bg-white/10">
      {/* Sport header skeleton */}
      <div className="flex items-center justify-between px-[5px] py-2 rounded-[4px] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
            backgroundSize: "300% 100%",
            animation: "flow 5s linear infinite",
          }}
        />
        <div className="flex items-center gap-2 flex-1 relative z-0">
          {/* Icon placeholder */}
          <div className="w-[20px] h-[18px] bg-white/5 rounded" />
          {/* Name placeholder */}
          <div className="h-4 bg-white/5 rounded w-20" />
          {/* Count placeholder */}
          <div className="h-4 bg-white/5 rounded w-12 ml-auto" />
        </div>
        {/* Arrow placeholder */}
        <div className="w-[24px] h-[24px] bg-white/5 rounded relative z-0" />
      </div>
      {/* regions skeleton */}
      <div className="flex flex-col bg-white/5">
        {Array.from({ length: regionsCount }).map((_, index) => (
          <RegionSkeleton
            key={`region-${index}`}
            competitionsCount={competitionsPerRegion}
          />
        ))}
      </div>
    </div>
  );
};

export const PrematchLoader: FunctionComponent<PrematchLoaderProps> = ({
  sportsCount = 3,
  regionsPerSport = 5,
  competitionsPerRegion = 2,
}) => {
  return (
    <div className="flex flex-col w-full gap-[2px] rounded-[4px]">
      {Array.from({ length: sportsCount }).map((_, index) => (
        <SportSkeleton
          key={`sport-${index}`}
          regionsCount={regionsPerSport}
          competitionsPerRegion={competitionsPerRegion}
        />
      ))}
    </div>
  );
};
