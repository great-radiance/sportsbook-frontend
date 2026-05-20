import { FunctionComponent } from "preact";
import { Match } from "@/app/components/MatchesBoard/components/Match";
import { useState } from "preact/hooks";
import { MarketInfoType } from "@/shared/utils/Market";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

interface DailyMatchesProps {
  events: number[];
  marketType?: number;
  singleColumn?: boolean;
  allowAutoSelect?: boolean;
  isLive?: boolean;
}

export const MatchesGroup: FunctionComponent<DailyMatchesProps> = ({
  events,
  marketType,
  allowAutoSelect = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <div
      className={`flex flex-col mt-[2px] rounded-[8px] overflow-hidden border-[1px] w-full border-[var(--border-color)] bg-[var(--background-element)]`}
    >
      {events?.map((eventId) => (
        <Match
          key={eventId}
          eventId={eventId}
          marketType={marketType}
          allowAutoSelect={allowAutoSelect}
        />
      ))}
    </div>
  );
};
