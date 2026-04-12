import { signal } from "@preact/signals";

export const teamlogosState = signal<Record<string, Record<string, string>>>(
  {},
);
