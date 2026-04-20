import { FunctionComponent } from "preact";
import { TopPlayerCard } from "./TopPlayerCard";
import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { useCallback, useRef } from "preact/hooks";
import "./style.scss";

export const StarPlayers: FunctionComponent = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Use native horizontal scrolling for the players carousel
  const scrollPrev = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: -distance, behavior: "smooth" });
  }, []);

  const scrollNext = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: distance, behavior: "smooth" });
  }, []);

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
        <div className="players-viewport" ref={viewportRef}>
          <div className="players-container">
            {Array.from({ length: 11 }).map((_, i) => (
              <div className="players-slide" key={i}>
                <TopPlayerCard />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="players-button players-button--prev"
          onClick={scrollPrev}
          aria-label="Previous slide"
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="Previous"
            className="rotate-180"
          />
        </button>

        <button
          type="button"
          className="players-button players-button--next"
          onClick={scrollNext}
          aria-label="Next slide"
        >
          <img
            src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
            alt="Next"
          />
        </button>
      </div>
    </div>
  );
};
