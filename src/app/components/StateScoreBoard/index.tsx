import { useRouteParams } from "@/hooks/useRotueParams";
import { accessToken } from "@/state/betState";
import { firstEventState } from "@/state/firstEventState";
import { storeState } from "@/state/storeState";
import { useRef } from "preact/hooks";

export const StateScoreBoard = () => {
  const { sportName, eventId } = useRouteParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="flex items-center rounded-[16px] justify-center">
      <iframe
        ref={iframeRef}
        src={`https://vl.feedthebet.com/3d-live-animation/${sportName || firstEventState.value?.[0] || "Soccer"}/en/${eventId || firstEventState.value?.[1] || 0}?token=${accessToken.value}`}
        className="w-full h-auto rounded-[16px] overflow-hidden min-h-[360px] max-h-[465px]"
      />
    </div>
  );
};
