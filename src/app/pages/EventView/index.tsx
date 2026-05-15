import { FunctionComponent } from "preact";
import { Sidebar } from "@/app/components/Sidebar";
import { RightSidebar } from "../RightSidebar";
import { useRouteParams } from "@/hooks/useRotueParams";
import { SwitchMachesBoard } from "./SwitchMachesBoard";
import { EmblaBanner } from "@/app/components/Banner";
import { BetSlip } from "@/app/components/BetSlip";
import { LiveEventView } from "./LiveEventView";
import { isOpenedMyBet } from "@/state/betState";

export const EventView: FunctionComponent = () => {
  const { pageName } = useRouteParams();

  console.log("rendering event view ......", pageName);

  return (
    <div className="relative flex flex-col md:flex-row w-full h-full bg-[var(--background-color)]">
      {pageName === "live" ? null : <Sidebar />}
      <div className="flex w-full min-w-0 h-full">
        {pageName === "live" ? (
          <div className="flex w-full min-w-0 min-h-0">
            <LiveEventView />
          </div>
        ) : (
          <>
            <div className="flex flex-col w-full min-w-0 h-full transition-all duration-300 ease-in-out">
              {!pageName && <EmblaBanner />}
              <div className="flex flex-col md:flex-row p-2 w-full min-w-0 h-full">
                <div className="flex w-full md:max-w-[calc(100%-320px)] h-full shrink-0">
                  <SwitchMachesBoard />
                </div>
                {console.log("isOpenedMyBet", isOpenedMyBet.value)}
                <div
                  className="absolute min-h-screen h-full z-[25] bottom-[70px] top-0 left-1 right-1 flex flex-col md:shrink-0 md:w-[320px] md:mt-2 md:mx-2 md:relative md:left-0 md:right-0"
                  style={{
                    display: isOpenedMyBet.value ? "flex" : "none",
                  }}
                >
                  <RightSidebar />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="fixed  bottom-[70px] md:bottom-0 left-1 md:left-auto z-[30] right-1 md:w-full md:max-w-[360px]">
        <BetSlip />
      </div>
    </div>
  );
};
