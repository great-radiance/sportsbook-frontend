import { signal } from "@preact/signals";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

export const betSlipExpanded = signal<boolean>(!sportsbookStore.isMobile.value);