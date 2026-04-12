import { signal } from "@preact/signals";

export const translationState = signal<{
  lang: string;
  translations: Record<string, string>;
}>({
  lang: "en",
  translations: {},
});
