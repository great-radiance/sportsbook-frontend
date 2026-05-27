import { FunctionComponent } from "preact";
import { TopPlayerCard } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import "./style.scss";
import { HorizontalTabs } from "../HorizontalTabs";
import type { StarPlayerCardResponse } from "@/api/home/homeWidgets";
import {
  addStarPlayerBundleToSlip,
  type WidgetSelectionInput,
} from "@/helpers/homeWidgetBetslip";
import {
  widgetMarketDisplayName,
  widgetOutcomeDisplayName,
} from "@/helpers/widgetDisplayNames";
import { starPlayersCache } from "@/state/homeWidgetsCache";

function pickToInput(
  pick: StarPlayerCardResponse["picks"][0],
  card: StarPlayerCardResponse,
): WidgetSelectionInput {
  const competitors = card.competitors;
  const nameFields = { ...pick, competitors };
  return {
    eventId: pick.eventId,
    marketId: pick.marketId,
    selectionId: pick.selectionId,
    marketName: widgetMarketDisplayName(nameFields),
    outcomeName: widgetOutcomeDisplayName(nameFields),
    odds: pick.odds,
    sport: card.sport,
    region: card.region,
    league: card.league,
    startTime: card.startTime,
    matchName: card.matchName,
  };
}

export const StarPlayers: FunctionComponent = () => {
  const [players, setPlayers] = useState<StarPlayerCardResponse[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = starPlayersCache.subscribe((v) => {
      if (v && mountedRef.current) setPlayers(v);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  const handleAddBundle = useCallback((card: StarPlayerCardResponse) => {
    const picks = card.picks.map((pick) => pickToInput(pick, card));
    void addStarPlayerBundleToSlip(card, picks);
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
