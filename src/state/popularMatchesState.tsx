import { tEvent } from "@/types/tEvent";
import { signal } from "@preact/signals";

export const popularMatchesState = signal<
  Record<string, Record<string, Record<string, number[]>>>
>({});
