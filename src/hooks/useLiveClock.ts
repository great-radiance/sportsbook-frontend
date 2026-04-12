import { useEffect, useMemo, useRef } from "preact/hooks";
import { useRouteParams } from "./useRotueParams";

function parseToSeconds(raw: any): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;

  if (typeof raw === "string") {
    const parts = raw.split(":").map(Number);
    if (parts.length === 2 && Number.isFinite(parts[0]))
      return parts[0] * 60 + (Number.isFinite(parts[1]) ? parts[1] : 0);
    if (parts.length === 3 && Number.isFinite(parts[0]))
      return (
        parts[0] * 3600 +
        (Number.isFinite(parts[1]) ? parts[1] : 0) * 60 +
        (Number.isFinite(parts[2]) ? parts[2] : 0)
      );
  }
  return null;
}

function mmss(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useImperativeLiveClock(
  ref: preact.RefObject<HTMLSpanElement>,
  rawTime: any,
  enabled: boolean,
  // labelWhenDisabled = "00:00",
) {
  const intervalRef = useRef<number | null>(null);
  const secsRef = useRef<number | null>(null);
  const { eventId } = useRouteParams();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // stop old interval
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled) {
      secsRef.current = null;
      const staticSecs = parseToSeconds(rawTime);
      el.textContent = mmss(staticSecs ?? 0);
      return;
    }

    const initial = parseToSeconds(rawTime);
    secsRef.current = initial;

    if (initial == null) {
      el.textContent = "00:00";
      return;
    }

    el.textContent = mmss(initial);

    intervalRef.current = window.setInterval(() => {
      const next = (secsRef.current ?? 0) + 1;
      secsRef.current = next;
      if (ref.current) ref.current.textContent = mmss(next);
    }, 1000);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ref, rawTime, enabled]);
}
