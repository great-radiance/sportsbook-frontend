import { FunctionComponent } from "preact";
import { TopPlayerCard } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import "./style.scss";
import { HorizontalTabs } from "../HorizontalTabs";
import {
  apiGetStarPlayers,
  type StarPlayerCardResponse,
} from "@/api/home/homeWidgets";
import { getAppConfig } from "@/shared/config/appConfig";
import {
  addStarPlayerBundleToSlip,
  type WidgetSelectionInput,
} from "@/helpers/homeWidgetBetslip";

const WIDGET_REFRESH_MS = 60_000;

function pickToInput(
  pick: StarPlayerCardResponse["picks"][0],
): WidgetSelectionInput {
  return {
    eventId: pick.eventId,
    marketId: pick.marketId,
    selectionId: pick.selectionId,
    marketName: pick.marketName,
    outcomeName: pick.outcomeName,
    odds: pick.odds,
  };
}

export const StarPlayers: FunctionComponent = () => {
  const [players, setPlayers] = useState<StarPlayerCardResponse[]>([]);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const { lang } = getAppConfig();
      const res = await apiGetStarPlayers({
        lang: lang || "en",
        limit: 20,
      });
      if (!mountedRef.current) return;
      setPlayers(res?.data ?? []);
    } catch {
      if (!mountedRef.current) return;
      setPlayers([]);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const t = window.setInterval(() => void load(), WIDGET_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(t);
    };
  }, [load]);

  const handleAddBundle = useCallback((card: StarPlayerCardResponse) => {
    void addStarPlayerBundleToSlip(card.picks.map(pickToInput));
  }, []);

  if (players.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex align-items w-full pt-4 pb-2 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt="Star Players"
          className="w-5 h-5"
        />
        <div className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold">
          Star Players
        </div>
      </div>

      <div className="players-carousel relative w-full">
        <div className="players-container">
          <HorizontalTabs>
            {players.map((player) => (
              <TopPlayerCard
                key={player.cardId}
                data={player}
                onAddToBetSlip={() => handleAddBundle(player)}
              />
            ))}
          </HorizontalTabs>
        </div>
      </div>
    </div>
  );
};
