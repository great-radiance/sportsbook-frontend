import { MarketsBoard } from "@/app/components/MarketsBoard";
import { Sidebar } from "@/app/components/Sidebar";
import { useRouteParams } from "@/hooks/useRotueParams";
import { FunctionComponent } from "preact";
import { RightSidebar } from "../../RightSidebar";
import { LiveMatchesPanel } from "@/app/components/Specials/LiveMatchesPanel";
import { isMobile } from "@/state/isMobile";
import { isOpenedMyBet } from "@/state/betState";

export const LiveEventView: FunctionComponent = () => {
  const { eventId } = useRouteParams();
  return (
    <div className="flex w-full relative p-2 md:px-0 bg-[var(--background-color)]">
      <div
        className={`flex flex-col`}
        style={{ display: isMobile.value || eventId ? "flex" : "none" }}
      >
        <Sidebar />
      </div>
      <div className="flex w-full h-full overflow-hidden">
        {eventId ? <MarketsBoard /> : <LiveMatchesPanel />}
      </div>
      <div
        className="absolute min-h-screen h-full z-[25] bottom-[70px] top-0 left-1 right-1 flex flex-col md:h-screen md:shrink-0 md:w-[480px] md:mt-2 md:mx-2 md:sticky md:top-0"
        style={{
          display: isOpenedMyBet.value ? "flex" : "none",
        }}
      >
        <RightSidebar />
      </div>
    </div>
  );
};
