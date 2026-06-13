/** @jsxImportSource preact */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

import EmblaCarousel, { EmblaCarouselType } from "embla-carousel";

import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

import type { BetBuilderHighlightCardResponse } from "@/api/home/apiGetHomeWidget";

import { addBetBuilderHighlightToSlip } from "@/helpers/homeWidgetBetslip";

import { widgetPickToSlipInput } from "@/helpers/widgetDisplayNames";

import { useSportsbookStore } from "@/state/sportsbookStoreContext";

import { SportsList } from "@/app/components/SportsList";

import { PrimePickCard } from "./PrimePickCard";

import "./prime-picks.scss";

const SPORT_TABS = [
  { id: 0, label: "All" },

  { id: 1, label: "Soccer" },

  { id: 8, label: "Basketball" },

  { id: 5, label: "Tennis" },
] as const;

export function PrimePicks() {
  const { homeWidgetsCache } = useSportsbookStore();
  const [cards, setCards] = useState<BetBuilderHighlightCardResponse[]>([]);

  const [showAll, setShowAll] = useState(false);

  const [activeSport, setActiveSport] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);

  const apiRef = useRef<EmblaCarouselType | null>(null);

  useEffect(() => {
    const sync = () => {
      setCards(homeWidgetsCache.value?.highlightBetBuilder ?? []);
    };

    console.log(
      "homeWidgetsCache.value?.highlightBetBuilder",
      homeWidgetsCache.value?.highlightBetBuilder,
    );

    sync();

    return homeWidgetsCache.subscribe(sync);
  }, []);

  useEffect(() => {
    if (!showAll) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAll(false);
    };

    document.addEventListener("keydown", onKey);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);

      document.body.style.overflow = "";
    };
  }, [showAll]);

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
  }, [cardIds]);

  const handleAdd = useCallback((card: BetBuilderHighlightCardResponse) => {
    void addBetBuilderHighlightToSlip(
      card,

      card.picks.map((pick) => widgetPickToSlipInput(pick, card)),
    );
  }, []);

  const visibleTabs = useMemo(() => {
    const sportIds = new Set(cards.map((c) => c.sportId));

    return SPORT_TABS.filter((t) => t.id === 0 || sportIds.has(t.id));
  }, [cards]);

  const modalSports = useMemo(
    () =>
      visibleTabs
        .filter((t) => t.id !== 0)
        .map((t) => ({ id: t.id, name: t.label })),
    [visibleTabs],
  );

  const showAllPopularTab = visibleTabs.some((t) => t.id === 0);

  const modalCards =
    activeSport === 0 ? cards : cards.filter((c) => c.sportId === activeSport);

  if (cards.length === 0) return null;

  return (
    <>
      <section class="prime-picks">
        <div class="prime-picks__header">
          <div class="prime-picks__title-row">
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/icons/top.png`}
              alt=""
              class="prime-picks__icon"
            />

            <h2 class="prime-picks__title">Prime Picks</h2>
          </div>

          <button
            type="button"
            class="prime-picks__view-all"
            onClick={() => setShowAll(true)}
          >
            View all
          </button>
        </div>

        <div class="prime-picks__carousel">
          <div class="prime-picks__viewport" ref={viewportRef}>
            <div class="prime-picks__track">
              {cards.map((card) => (
                <div class="prime-picks__slide" key={card.cardId}>
                  <PrimePickCard card={card} onAdd={() => handleAdd(card)} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            class="prime-picks__nav prime-picks__nav--prev"
            onClick={() => apiRef.current?.scrollPrev()}
            aria-label="Previous"
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              alt=""
            />
          </button>

          <button
            type="button"
            class="prime-picks__nav prime-picks__nav--next"
            onClick={() => apiRef.current?.scrollNext()}
            aria-label="Next"
          >
            <img
              src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
              alt=""
            />
          </button>
        </div>
      </section>

      {showAll ? (
        <div
          class="prime-picks-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Prime Picks"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAll(false);
          }}
        >
          <div class="prime-picks-modal__panel">
            <div class="prime-picks-modal__header">
              <h2 class="prime-picks-modal__title">Prime Picks</h2>

              <button
                type="button"
                class="prime-picks-modal__close"
                onClick={() => setShowAll(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div class="prime-picks-modal__body">
              <div class="prime-picks-modal__tabs">
                <SportsList
                  sportsData={modalSports}
                  selectedSport={activeSport}
                  onSelectSport={setActiveSport}
                  showPopular={showAllPopularTab}
                />
              </div>

              <div class="prime-picks-modal__list">
                {modalCards.length === 0 ? (
                  <p class="prime-picks-modal__empty">
                    No picks for this sport.
                  </p>
                ) : (
                  modalCards.map((card) => (
                    <PrimePickCard
                      key={card.cardId}
                      card={card}
                      compact
                      onAdd={() => handleAdd(card)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
