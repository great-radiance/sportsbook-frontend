import { apiGetMatchData } from "@/api/matches/apiGetMatchData";
import { useRouteParams } from "@/hooks/useRotueParams";
import { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
interface props {
  eventId: number;
}

export const Statistic: FunctionComponent<props> = ({ eventId }) => {
  const { pageName } = useRouteParams();
  const [versus, setVersus] = useState<any>(null);
  useEffect(() => {
    if (!pageName) return;
    let cancelled = false;
    const stats = useRef({
      home: 0,
      away: 0,
      draw: 0,
    });
    useEffect(() => {
      (async () => {
        try {
          const res = await apiGetMatchData(eventId);
          // const versus = res.stats.h2hPreviousMatches.statistics.versus;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      })();
    }, [eventId]);

    return () => {
      cancelled = true;
    };
  }, [pageName, eventId]);
  return (
    <div className="w-full h-full flex flex-col items-center gap-2">
      <div className="w-full flex flex-row items-center justify-between gap-2">
        <span className="text-[12px]">{versus?.matches?.[0]}</span>
        <span className="text-[12px]">Away</span>
        <span className="text-[12px]">Draw</span>
      </div>
    </div>
  );
};
