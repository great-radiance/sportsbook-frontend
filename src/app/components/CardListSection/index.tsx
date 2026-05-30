/** @jsxImportSource preact */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import EmblaCarousel, { EmblaCarouselType } from "embla-carousel";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { cardListState } from "@/state/cardListState";
import type { tCard } from "./tCard";
import "./style.scss";

function CardThumb({ card, onClick }: { card: tCard; onClick: () => void }) {
  return (
    <button type="button" class="card-list__slide" onClick={onClick}>
      <img class="card-list__image" src={card.image} alt={card.title} />
      <img class="card-list__icon" src={card.icon} alt="" />
      <span class="card-list__subtitle">{card.subTitle}</span>
    </button>
  );
}

function ZoomSlide({ card }: { card: tCard }) {
  return (
    <div class="card-list-zoom__slide">
      <img class="card-list-zoom__image" src={card.image} alt={card.title} />
      <div class="card-list-zoom__overlay" />
      <div class="card-list-zoom__content">
        <div class="card-list-zoom__top">
          <div class="card-list-zoom__header">
            <img class="card-list-zoom__header-icon" src={card.icon} alt="" />
            <span class="card-list-zoom__header-subtitle">{card.subTitle}</span>
          </div>
          <h2 class="card-list-zoom__title">{card.title}</h2>
          <p class="card-list-zoom__description">{card.description}</p>
        </div>
        <div class="card-list-zoom__footer">
          <a
            class="card-list-zoom__cta"
            href={card.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {card.buttonText}
          </a>
        </div>
      </div>
    </div>
  );
}

export const CardListSection = () => {
  const cards = cardListState.value;
  const listViewportRef = useRef<HTMLDivElement>(null);
  const listApiRef = useRef<EmblaCarouselType | null>(null);
  const zoomViewportRef = useRef<HTMLDivElement>(null);
  const zoomApiRef = useRef<EmblaCarouselType | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!listViewportRef.current) return;
    const api = EmblaCarousel(listViewportRef.current, {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: true,
    });
    listApiRef.current = api;
    const onResize = () => api.reInit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      api.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    if (zoomIndex === null) return;
    const viewport = zoomViewportRef.current;
    if (!viewport) return;

    const startIndex = zoomIndex;
    const api = EmblaCarousel(viewport, {
      align: "start",
      loop: true,
      containScroll: false,
    });
    zoomApiRef.current = api;

    const scrollToStart = () => api.scrollTo(startIndex, true);

    api.on("init", scrollToStart);

    const onImagesLoaded = () => {
      api.reInit();
      scrollToStart();
    };
    viewport.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", onImagesLoaded, { once: true });
    });

    requestAnimationFrame(() => {
      api.reInit();
      scrollToStart();
    });

    const onResize = () => api.reInit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      api.destroy();
      zoomApiRef.current = null;
    };
  }, [zoomIndex]);

  useEffect(() => {
    if (zoomIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIndex]);

  const scrollListPrev = useCallback(
    () => listApiRef.current?.scrollPrev(),
    [],
  );
  const scrollListNext = useCallback(
    () => listApiRef.current?.scrollNext(),
    [],
  );
  const scrollZoomPrev = useCallback(() => {
    const api = zoomApiRef.current;
    if (!api) return;
    if (api.canScrollPrev()) api.scrollPrev();
    else api.scrollTo(api.scrollSnapList().length - 1);
  }, []);
  const scrollZoomNext = useCallback(() => {
    const api = zoomApiRef.current;
    if (!api) return;
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  }, []);

  if (!cards.length) return null;

  return (
    <>
      <div class="card-list">
        <div class="card-list__viewport" ref={listViewportRef}>
          <div class="card-list__container">
            {cards.map((card, index) => (
              <CardThumb
                key={`${card.title}-${index}`}
                card={card}
                onClick={() => setZoomIndex(index)}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          class="card-list__button card-list__button--prev"
          onClick={scrollListPrev}
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
          class="card-list__button card-list__button--next"
          onClick={scrollListNext}
          aria-label="Next"
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt=""
            class="invert w-[14px] h-[14px]"
          />
        </button>
      </div>

      {zoomIndex !== null ? (
        <div
          class="card-list-zoom"
          onClick={() => setZoomIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            class="card-list-zoom__close"
            aria-label="Close"
            onClick={() => setZoomIndex(null)}
          >
            ×
          </button>

          <div
            class="card-list-zoom__frame"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="card-list-zoom__viewport" ref={zoomViewportRef}>
              <div class="card-list-zoom__container">
                {cards.map((card, index) => (
                  <ZoomSlide key={`zoom-${index}`} card={card} />
                ))}
              </div>
            </div>

            <button
              type="button"
              class="card-list-zoom__nav card-list-zoom__nav--prev"
              onClick={scrollZoomPrev}
              aria-label="Previous card"
            >
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                alt=""
                class="invert rotate-180 w-[16px] h-[16px]"
              />
            </button>
            <button
              type="button"
              class="card-list-zoom__nav card-list-zoom__nav--next"
              onClick={scrollZoomNext}
              aria-label="Next card"
            >
              <img
                src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
                alt=""
                class="invert w-[16px] h-[16px]"
              />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};
