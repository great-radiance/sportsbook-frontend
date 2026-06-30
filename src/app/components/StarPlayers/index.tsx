import { FunctionComponent } from "preact";
import { TopPlayerCard } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useCallback, useEffect, useState } from "preact/hooks";
import "./style.scss";
import { HorizontalTabs } from "../HorizontalTabs";
import type { StarPlayerCardResponse } from "@/api/home/apiGetHomeWidget";
import {
  addStarPlayerBundleToSlip,
} from "@/helpers/homeWidgetBetslip";
import { widgetPickToSlipInput } from "@/helpers/widgetDisplayNames";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";

export const StarPlayers: FunctionComponent = () => {
  const { homeWidgetsCache } = useSportsbookStore();
  const [players, setPlayers] = useState<StarPlayerCardResponse[]>(
    homeWidgetsCache.value?.starPlayers ?? [],
  );

  useEffect(() => {
    if (homeWidgetsCache.value) setPlayers(homeWidgetsCache.value.starPlayers);
    return homeWidgetsCache.subscribe((value) => {
      if (value) setPlayers(value.starPlayers);
    });
  }, []);

  const handleAddBundle = useCallback((card: StarPlayerCardResponse) => {
    void addStarPlayerBundleToSlip(
      card,
      card.picks.map((pick) => widgetPickToSlipInput(pick, card)),
    );
  }, []);

  if (players.length === 0) return null;

  return (
    <section className="flex flex-col items-center gap-4">
      <div className="flex align-items w-full pt-4 pb-2 gap-2 items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt=""
          className="w-5 h-5"
        />
        <h2 className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold m-0">
          Star Players
        </h2>
      </div>

      <div className="players-carousel relative w-full">
        <HorizontalTabs contentClassName="items-stretch">
          {players.map((player) => (
            <TopPlayerCard
              key={player.cardId}
              data={player}
              onAddToBetSlip={() => handleAddBundle(player)}
            />
          ))}
        </HorizontalTabs>
      </div>
    </section>
  );
};
