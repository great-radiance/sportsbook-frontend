import { FunctionComponent } from "preact";
import { Match } from "@/app/components/MatchesBoard/components/Match";
import { useState } from "preact/hooks";
import { MoneylineMatch } from "../Match/MoneylineMatch";

interface DailyMatchesProps {
  events: number[];
  marketType?: number;
  singleColumn?: boolean;
  allowAutoSelect?: boolean;
  isLive?: boolean;
  isMoneyline?: boolean;
}

export const MatchesGroup: FunctionComponent<DailyMatchesProps> = ({
  events,
  marketType,
  isMoneyline = false,
  allowAutoSelect = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <div
      className={`flex flex-col mt-[2px] ${isMoneyline ? "" : "rounded-[8px] overflow-hidden border-[1px] w-full border-[var(--border-color)] bg-[var(--background-element)]"}`}
    >
      {events?.map((eventId) =>
        isMoneyline ? (
          <MoneylineMatch eventId={eventId} />
        ) : (
          <Match
            key={eventId}
            eventId={eventId}
            marketType={marketType}
            allowAutoSelect={allowAutoSelect}
          />
        ),
      )}
    </div>
  );
};
