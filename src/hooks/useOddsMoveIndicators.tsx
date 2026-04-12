import { useEffect, useReducer, useRef } from "preact/hooks";

type MoveVal = -1 | 0 | 1;

export type MoveIndicator = { mv: MoveVal; tick: number };

export function useOddsMoveIndicators(
  odds: Array<{ mv: number; properties: { uuid: string } }> | undefined,
  updateSeq: number | string | undefined // <-- changes every push
) {
  const ref = useRef<Record<string, MoveIndicator>>({});
  const [, bump] = useReducer((x: number, _a: 0) => x + 1, 0);

  useEffect(() => {
    if (!odds) return;

    let shouldRerender = false;

    for (const odd of odds) {
      const uuid = odd.properties.uuid;
      const mv = odd.mv as MoveVal;

      if (mv !== 0) {
        const prev = ref.current[uuid];
        ref.current[uuid] = { mv, tick: (prev?.tick ?? 0) + 1 };
        shouldRerender = true;
      }
      // mv===0: keep showing once it arrived (your requirement)
    }

    if (shouldRerender) bump(0);
  }, [updateSeq]); // ✅ reruns on EVERY message, super cheap

  return { get: (uuid: string) => ref.current[uuid] };
}
