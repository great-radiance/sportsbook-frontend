import { sportsbookStore } from "@/state/sportsbookStoreContext";

/** Ignore header auto-open until after dialog teardown + focus restore. */
const REOPEN_SUPPRESS_MS = 800;

export function suppressSearchDialogReopen() {
  sportsbookStore.searchOpenSuppressedUntil.value =
    Date.now() + REOPEN_SUPPRESS_MS;
}

export function shouldSuppressSearchDialogOpen() {
  return Date.now() < sportsbookStore.searchOpenSuppressedUntil.value;
}

export function openSportsbookSearchDialog() {
  if (shouldSuppressSearchDialogOpen()) return;
  sportsbookStore.showSearchState.value = true;
}

/** State-only close — dialog hide is driven by the Search component effect. */
export function closeSportsbookSearchDialog() {
  if (!sportsbookStore.showSearchState.peek()) return;

  suppressSearchDialogReopen();
  sportsbookStore.showSearchState.value = false;

  blurHeaderSearchInput();

  sportsbookStore.isOpenedMyBet.value = sportsbookStore.isMobile.value
    ? false
    : true;
  sportsbookStore.isOpenedSidebar.value = false;
}

export function blurHeaderSearchInput() {
  const headerInput = document.querySelector<HTMLInputElement>(
    'header input[name="search"]',
  );
  headerInput?.blur();

  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    !active.closest("sl-dialog.searchDialog")
  ) {
    active.blur();
  }
}
