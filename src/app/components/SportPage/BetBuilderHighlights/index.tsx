/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import EmblaCarousel, { EmblaCarouselType } from "embla-carousel";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import type { BetBuilderHighlightCardResponse } from "@/api/home/apiGetHomeWidget";
import { addBetBuilderHighlightToSlip } from "@/helpers/homeWidgetBetslip";
import { widgetPickToSlipInput } from "@/helpers/widgetDisplayNames";
import { loadBetBuilderHighlights } from "@/state/sportsbookStoreHelpers";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { BetBuilderHighlightCard } from "./BetBuilderHighlightCard";
import "./style.scss";

type Props = {
  sportId: number;
};

export const BetBuilderHighlights: FunctionComponent<Props> = ({ sportId }) => {
  const { betBuilderHighlightsCache, betBuilderHighlightsSportId } =
    useSportsbookStore();
  const [cards, setCards] = useState<BetBuilderHighlightCardResponse[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<EmblaCarouselType | null>(null);

  useEffect(() => {
    void loadBetBuilderHighlights({ sportId });
  }, [sportId]);

  useEffect(() => {
    const sync = () => {
      if (betBuilderHighlightsSportId.value !== sportId) {
        setCards([]);
        return;
      }
      setCards([...betBuilderHighlightsCache.value]);
    };
    sync();
    const unsubCache = betBuilderHighlightsCache.subscribe(sync);
    const unsubSport = betBuilderHighlightsSportId.subscribe(sync);
    return () => {
      unsubCache();
      unsubSport();
    };
  }, [sportId]);

  const cardIds = cards.map((c) => c.cardId).join(",");

  useEffect(() => {
    if (!viewportRef.current || cards.length === 0) return;

    const api = EmblaCarousel(viewportRef.current, {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: true,
    });
    apiRef.current = api;

    const onResize = () => api.reInit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      api.destroy();
      apiRef.current = null;
    };
  }, [cardIds, sportId]);

  const scrollPrev = useCallback(() => apiRef.current?.scrollPrev(), []);
  const scrollNext = useCallback(() => apiRef.current?.scrollNext(), []);

  const handleAdd = useCallback((card: BetBuilderHighlightCardResponse) => {
    void addBetBuilderHighlightToSlip(
      card,
      card.picks.map((p) => widgetPickToSlipInput(p, card)),
    );
  }, []);

  if (cards.length === 0) return null;

  return (
    <section class="bbh-carousel">
      <div class="flex w-full pb-3 gap-2 items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt=""
          class="w-5 h-5"
        />
        <h2 class="text-[16px] uppercase text-[var(--text-basic-color)] font-semibold m-0">
          Bet Builder Highlights
        </h2>
      </div>

      <div class="bbh-carousel__viewport" ref={viewportRef}>
        <div class="bbh-carousel__container">
          {cards.map((card) => (
            <div class="bbh-carousel__slide" key={card.cardId}>
              <BetBuilderHighlightCard
                card={card}
                onAddToSlip={() => handleAdd(card)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        class="bbh-carousel__button bbh-carousel__button--prev"
        onClick={scrollPrev}
        aria-label="Previous"
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          alt=""
          class="invert rotate-180 w-[14px] h-[14px]"
        />
      </button>
      <button
        type="button"
        class="bbh-carousel__button bbh-carousel__button--next"
        onClick={scrollNext}
        aria-label="Next"
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          alt=""
          class="invert w-[14px] h-[14px]"
        />
      </button>
    </section>
  );
};
