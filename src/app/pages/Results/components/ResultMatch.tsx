import { FunctionComponent } from "preact";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { formatStartTime } from "@/app/components/MatchesBoard/components/Match";
import { useState } from "preact/hooks";
import { isMobile } from "@/state/isMobile";
import { getFlagIconFromregionName } from "@/helpers/getFlagIconFromregionName";

interface ResultMatchProps {
  matchData: any;
  onClick: (eventId: number) => void;
}

const formatDate = (date: number): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const ResultMatch: FunctionComponent<ResultMatchProps> = ({
  matchData,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const live = matchData?.backup?.[0]?.live;
  return (
    <div className="flex flex-col w-full cursor-pointer bg-[var(--sub-element-color)]">
      {/* League Header */}
      <div
        className={`flex w-full h-[34px] px-[7px] items-center bg-white/15 gap-2 rounded-[4px] cursor-pointer transition-colors ${!isMobile.value ? "hover:bg-white/20" : ""}`}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <img
            src={getFlagIconFromregionName(matchData.regionSlug || "")}
            className="rounded-[4px] w-[14px] h-[14px] flex-shrink-0"
          />
          <span className="text-[12px] truncate min-w-0 text-left overflow-hidden">
            {matchData.league?.name || matchData.league?.providerName || ""}(
            {matchData.region?.name || ""})
          </span>
        </div>
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className={`w-[20px] h-[20px] transition-transform ${isExpanded ? "-rotate-90" : "rotate-90"}`}
        />
      </div>
      {isExpanded && (
        <div
          className="flex flex-col w-full p-[6px] bg-white/5 rounded-[4px] cursor-pointer"
          onClick={() => {
            onClick(matchData.eventId);
          }}
        >
          <div className="flex flex-col w-full rounded-[4px] p-1 overflow-hidden bg-white/10">
            <div className="flex w-full py-[2px] items-center justify-between px-[7px] gap-2">
              <span className="text-[12px]">
                {matchData.participants?.[0]?.name ||
                  matchData.participants?.[0]?.providerName ||
                  ""}
              </span>
              <span className="text-[12px] text-[var(--primary-color)]">
                {live?.scoreBoard?.goals?.h || 0}
              </span>
            </div>
            <div className="flex w-full py-[2px] items-center justify-between px-[7px] gap-2">
              <span className="text-[12px]">
                {matchData.participants?.[1]?.name ||
                  matchData.participants?.[1]?.providerName ||
                  ""}
              </span>
              <span className="text-[12px] text-[var(--primary-color)]">
                {live?.scoreBoard?.goals?.g || 0}
              </span>
            </div>
            <div className="flex w-full py-[2px] text-[11px] items-center px-[7px] gap-2">
              <span className="">
                {live?.scoreBoard?.goals?.h || 0}:
                {live?.scoreBoard?.goals?.g || 0} (
                {live?.scoreBoard?.half?.h || 0}:
                {live?.scoreBoard?.half?.g || 0})
              </span>
            </div>
            <div className="w-full my-[2px] h-[1px] bg-[var(--background-color)]"></div>
            <div className="flex w-full mt-[1px] items-center px-[7px] gap-2">
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/clock.png`}
                className="w-[14px] h-[14px] grayscale-[0.5]"
              />
              <span className="text-[11px]">
                {formatStartTime(matchData.startDate)}
              </span>
              <div className="w-[0px] h-[14px] border-l-[1px] border-[var(--background-color)]"></div>
              <span className="text-[11px]">
                {formatDate(matchData.startDate)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
