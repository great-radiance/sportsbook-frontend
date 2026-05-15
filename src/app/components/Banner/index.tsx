/** @jsxImportSource preact */
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import EmblaCarousel, { EmblaCarouselType } from "embla-carousel";
import "./style.scss";
import { popularMatchesState } from "@/state/popularMatchesState";
import { BASE_ASSET_PUBLIC_URL, getAppConfig } from "@/shared/config/appConfig";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { Market } from "../MatchesBoard/components/Match/Market";
import { storeState } from "@/state/storeState";
import { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import { loadedMatchesState } from "@/state/loadedMatchesState";
import { linkButtonOnClick } from "@/helpers/linkButtonClick";
import { useLocation } from "wouter-preact";
import { baseColorTheme } from "@/state/baseColorTheme";

const slides = [
  {
    id: "1",
    image:
      "https://assets.gmlinteractive.com/2026/03/e41ef4e2ea31_392023-344x260.webp",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-1.webp`,
    title: "100% Welcome Bonus",
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },

  {
    id: "2",
    image: `https://assets.gmlinteractive.com/2026/03/705360c08710_392027-344x260.webp`,
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-2.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "3",
    image: `https://assets.gmlinteractive.com/2026/03/81dbc7e86a39_392027-344x260.webp`,
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-3.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "4",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-4.webp`,
    image: `https://assets.gmlinteractive.com/2026/03/32c6c7f190b6_392027-344x260.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "6",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-4.webp`,
    image: `https://assets.gmlinteractive.com/2026/04/2c5f50990670_392482-344x260.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "7",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-4.webp`,
    image: `https://assets.gmlinteractive.com/2026/03/0752ad93ffdb_392027-344x260.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "8",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-4.webp`,
    image: `https://assets.gmlinteractive.com/2026/03/4102d5bf7363_392027-344x260.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
  {
    id: "9",
    // image: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-4.webp`,
    image: `https://assets.gmlinteractive.com/2026/03/255d9c487b4c_392027-344x260.webp`,
    // overImg: `${BASE_ASSET_PUBLIC_URL}/images/stoiximan/banner-background.webp`,
  },
];

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
  const baseTheme = baseColorTheme.value;
  const popularMatches = popularMatchesState.value as Record<
    string,
    Record<string, Record<string, number[]>>
  >;
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
    const markets = Object.values(event?.markets ?? {});
    const preferred = markets.find((m) => {
      const n = m.value.name.toLowerCase();
      return n.includes("winner") || n.includes("match result");
    });

    return preferred?.value ?? markets[0]?.value;
  };

  // Get winner market (usually the first market)

  useEffect(() => {
    const allIds: number[] = [];
    for (const sport of Object.keys(popularMatches)) {
      for (const region of Object.keys(popularMatches[sport] ?? {})) {
        for (const league of Object.keys(popularMatches[sport][region] ?? {})) {
          allIds.push(...(popularMatches[sport][region][league] ?? []));
        }
      }
    }
    setEvents(
      allIds.filter(
        (id) =>
          storeState.value[id]?.value &&
          Object.keys(storeState.value[id]?.value?.markets || {}).length > 0,
      ),
    );
  }, [popularMatches, storeState.value, loadedMatchesState.value]);

  return (
    <div class="embla">
      <div class="embla__viewport" ref={viewportRef}>
        <div class="embla__container">
          {slides.map((slide, index) => {
            const eventId = events.length ? events[index % events.length] : 1;
            const event = storeState.value[eventId];
            const homeTeam = event?.value?.competitors?.[0]?.name || "Home";
            const awayTeam = event?.value?.competitors?.[1]?.name || "Away";
            const eventTime = formatEventTime(event?.value);
            const eventDateLabel = formatEventDate(event?.value);

            const selectedMarket = getSelectedMarket(event?.value);

            return (
              <div key={slide.id} className="embla__slide ">
                <img src={`aaa${slide.image}`} alt={slide.title || "Banner"} />
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
                        {/* Team logos omitted — product choice: show names only (no club badge URLs). */}
                        {/*
                        <img
                          src={
                            cachedTeamLogoUrl(
                              event?.value?.sport?.name,
                              homeTeam,
                            ) ||
                            `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-home.png`
                          }
                          alt={homeTeam}
                          className="max-w-[20px] max-h-[20px] object-contain shrink-0"
                        />
                        */}
                        {homeTeam}
                      </div>
                      <div class="banner-team flex items-center gap-2">
                        {/*
                        <img
                          src={
                            cachedTeamLogoUrl(
                              event?.value?.sport?.name,
                              awayTeam,
                            ) ||
                            `${BASE_ASSET_PUBLIC_URL}/logo/default-logo/default-away.png`
                          }
                          alt={awayTeam}
                          className="max-w-[20px] max-h-[20px] object-contain shrink-0"
                        />
                        */}
                        {awayTeam}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-center gap-1 mb-1">
                      {selectedMarket && (
                        <Market
                          eventId={event?.value?.id}
                          marketId={selectedMarket.id}
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
