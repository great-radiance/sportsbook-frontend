import { signal } from "@preact/signals";

export type OddsChangedLine = {
  label: string;
  oldOdds: number;
  newOdds: number;
};

export const oddsChangedDialogOpen = signal(false);
export const oddsChangedDialogLines = signal<OddsChangedLine[]>([]);
export const oddsChangedDialogMessage = signal<string>(
  "Odds have changed. Review updated prices before placing again.",
);

export function showOddsChangedDialog(
  lines: OddsChangedLine[],
  message?: string,
): void {
  oddsChangedDialogLines.value = lines;
  if (message) oddsChangedDialogMessage.value = message;
  oddsChangedDialogOpen.value = true;
}

export function closeOddsChangedDialog(): void {
  oddsChangedDialogOpen.value = false;
  oddsChangedDialogLines.value = [];
}
