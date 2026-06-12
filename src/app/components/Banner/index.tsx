/** @jsxImportSource preact */
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import EmblaCarousel, { EmblaCarouselType } from "embla-carousel";
import "./style.scss";
import { BASE_ASSET_PUBLIC_URL, modeBySport } from "@/shared/config/appConfig";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { Market } from "../MatchesBoard/components/Match/Market";
import { storeState } from "@/state/storeState";
import { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import { loadedMatchesState } from "@/state/loadedMatchesState";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useLocation } from "wouter-preact";
import { baseColorTheme } from "@/state/baseColorTheme";
import { apiGetPopularMatches } from "@/api/matches/apiGetPopularMatches";
import { popularMatchesState } from "@/state/popularMatchesState";
import { storeEvent } from "@/helpers/storeEvent";

const formatEventTime = (event: tEventModel | undefined): string => {
  if (!event?.startTime) return "22:00";
  const d = new Date(event.startTime);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// return 'today' if the event is today (local), otherwise return M/D (e.g. 2/17)
const formatEventDate = (event: tEventModel | undefined): string => {
  if (!event?.startTime) return "";
  const d = new Date(event.startTime);
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return "Today";
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const EmblaBanner = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const emblaApiRef = useRef<EmblaCarouselType | null>(null);
  const [events, setEvents] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const baseIndex = Math.floor((new Date().getTime() / (3600 * 24)) % 10);

  useEffect(() => {
    if (!viewportRef.current) return;

    const api = EmblaCarousel(viewportRef.current, {
      loop: true,
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
    });

    emblaApiRef.current = api;

    const onResize = () => api.reInit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      api.destroy();
    };
  }, []);

  const scrollPrev = useCallback(() => emblaApiRef.current?.scrollPrev(), []);
  const scrollNext = useCallback(() => emblaApiRef.current?.scrollNext(), []);

  // helper to normalize different market wrappers to the raw market object

  const getSelectedMarket = (event: tEventModel) => {
    const markets = Object.keys(event?.markets ?? {});
    const preferred = markets.find((m) => {
      if (event.markets[parseInt(m)].value.type === 1) return true;
      const n = event.markets[parseInt(m)].value.name.toLowerCase();
      return n.includes("winner") || n.includes("match result");
    });

    return parseInt(preferred ?? markets[0]);
  };

  // Get winner market (usually the first market)

  useEffect(() => {
    const allIds = popularMatchesState.value.map((match) => match.eventInfo.id);
    popularMatchesState.value.forEach((match) => storeEvent(match));
    setEvents(
      allIds
        .filter(
          (id) =>
            storeState.value[id]?.value &&
            Object.keys(storeState.value[id]?.value?.markets || {}).length >
              0 &&
            modeBySport[storeState.value[id]?.value?.sport?.id],
        )
        .sort((a, b) => {
          const eventA = storeState.value[a];
          const eventB = storeState.value[b];
          return eventA?.value?.sport?.id - eventB?.value?.sport?.id;
        }),
    );
  }, [popularMatchesState.value, storeState.value, loadedMatchesState.value]);

  return (
    <div class="embla">
      <div class="embla__viewport" ref={viewportRef}>
        <div class="embla__container">
          {events.map((eventId, index) => {
            const event = storeState.value[eventId];
            const homeTeam = event?.value?.competitors?.[0]?.name || "Home";
            const awayTeam = event?.value?.competitors?.[1]?.name || "Away";
            const eventTime = formatEventTime(event?.value);
            const eventDateLabel = formatEventDate(event?.value);
            const selectedMarket = getSelectedMarket(event?.value);
            return (
              <div
                key={eventId}
                className="embla__slide "
                style={{
                  order: event.value?.sport?.id,
                }}
              >
                <img
                  src={`${BASE_ASSET_PUBLIC_URL}/stoiximan/banner/${event.value?.sport?.id}/${(baseIndex + index) % modeBySport[event.value?.sport?.id]}.webp`}
                  alt="Banner"
                />
                <div className="banner-overlay-image"></div>
                {event && (
                  <div className="banner-overlay cursor-pointer h-full">
                    <div
                      class="banner-top"
                      onClick={(e) => {
                        linkButtonOnClick(
                          e,
                          `/event-view/${event.value?.status === 1 ? "pre-match" : "live"}/${event.value?.sport?.name}/${event.value?.sport?.id}/${event.value?.region?.name}/${event.value?.region?.id}/${event.value?.league?.name}/${event.value?.league?.id}/${event.value?.id}`,
                          setLocation,
                        );
                      }}
                    >
                      <div className="flex items-center bg-[var(--background-color)] rounded-full mt-2 py-1 px-2">
                        {/* <div class="banner-badge">SO</div> */}

                        <div class="banner-time">
                          {eventDateLabel} | {eventTime}
                        </div>
                      </div>
                    </div>

                    <div
                      class="banner-teams"
                      onClick={(e) => {
                        linkButtonOnClick(
                          e,
                          `/event-view/${event.value?.status !== 3 ? "pre-match" : "live"}/${event.value?.sport?.name}/${event.value?.sport?.id}/${event.value?.region?.name}/${event.value?.region?.id}/${event.value?.league?.name}/${event.value?.league?.id}/${event.value?.id}`,
                          setLocation,
                        );
                      }}
                    >
                      <div class="banner-team flex items-center">
                        {homeTeam}
                      </div>
                      <div class="banner-team flex items-center gap-2">
                        {awayTeam}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-center gap-1 mb-1">
                      {selectedMarket && (
                        <Market
                          eventId={event?.value?.id}
                          marketId={selectedMarket}
                          // single={true}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        class="embla__button embla__button--prev"
        onClick={scrollPrev}
        aria-label="Previous slide"
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          alt="Previous"
          className={`invert rotate-180`}
        />
      </button>

      <button
        type="button"
        class="embla__button embla__button--next"
        onClick={scrollNext}
        aria-label="Next slide"
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          alt="Next"
          className={`invert`}
        />
      </button>
    </div>
  );
};
