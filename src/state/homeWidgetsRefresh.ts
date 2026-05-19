import { signal } from "@preact/signals";

/** Increment to force home widget components to reload. */
export const homeWidgetsRefreshNonce = signal(0);

export function refreshHomeWidgets(): void {
  homeWidgetsRefreshNonce.value += 1;
}
