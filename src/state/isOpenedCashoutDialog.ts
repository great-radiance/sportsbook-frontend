import { signal } from "@preact/signals";

export const isOpenedCashoutDialog = signal<boolean>(false);
export const cashoutDialogOnSuccess = signal<(() => void) | null>(null);
