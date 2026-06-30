import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import { FunctionalComponent } from "preact";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";

type Props = {
  children: preact.ComponentChildren;
  className?: string; // wrapper
  scrollerClassName?: string; // the scrolling row
  contentClassName?: string; // inner row (e.g. equal-height cards)
  step?: number; // px to scroll per click
};

export const HorizontalTabs: FunctionalComponent<Props> = ({
  children,
  className = "",
  scrollerClassName = "",
  contentClassName = "",
  step = 260,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const didDrag = useRef(false);

  const DRAG_THRESHOLD_PX = 5;

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // small epsilon to avoid off-by-1 rounding issues
    const eps = 1;
    setCanLeft(el.scrollLeft > eps);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - eps);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    // if children change widths, update on next frame
    const raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [update, children]);

  useEffect(() => {
    if (!isDragging) return;
    const el = scrollerRef.current;
    const onMove = (e: MouseEvent) => {
      if (!el) return;
      if (Math.abs(e.clientX - dragStartX.current) > DRAG_THRESHOLD_PX) {
        didDrag.current = true;
      }
      const dx = dragStartX.current - e.clientX;
      el.scrollLeft = dragStartScrollLeft.current + dx;
      update();
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, update]);

  const onScrollerMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || !scrollerRef.current) return;
    e.preventDefault();
    didDrag.current = false;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = scrollerRef.current.scrollLeft;
    setIsDragging(true);
  };

  const onScrollerClickCapture = (e: MouseEvent) => {
    if (!didDrag.current) return;
    e.preventDefault();
    e.stopPropagation();
    didDrag.current = false;
  };

  const scrollByPx = (dx: number) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Left button */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByPx(-step)}
        disabled={!canLeft}
        className={[
          "absolute left-1 top-1/2 -translate-y-1/2 z-10",
          "h-8 w-8 rounded-full border border-white/10 bg-black/40 backdrop-blur",
          "flex items-center justify-center",
          "disabled:opacity-0 disabled:pointer-events-none",
        ].join(" ")}
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className="w-4 h-4 rotate-180 brightness-0 invert"
          alt="scroll-left"
        />
      </button>

      {/* Right button */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByPx(step)}
        disabled={!canRight}
        className={[
          "absolute right-1 top-1/2 -translate-y-1/2 z-10",
          "h-8 w-8 rounded-full border border-white/10 bg-black/40 backdrop-blur",
          "flex items-center justify-center",
          "disabled:opacity-0 disabled:pointer-events-none",
        ].join(" ")}
      >
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/arrow-right.png`}
          className="w-4 h-4 brightness-0 invert"
          alt="scroll-right"
        />
      </button>

      {/* The actual scroller */}
      <div
        ref={scrollerRef}
        onMouseDown={onScrollerMouseDown}
        onClickCapture={onScrollerClickCapture}
        className={[
          "overflow-x-auto overflow-y-hidden",
          "scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
          "cursor-grab active:cursor-grabbing",
          isDragging ? "select-none cursor-grabbing" : "",
          scrollerClassName,
        ].join(" ")}
      >
        <div
          className={["inline-flex gap-2", contentClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </div>

      {/* Optional fade edges (nice like many UIs) */}
      {/* <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/60 to-transparent" /> */}
    </div>
  );
};
