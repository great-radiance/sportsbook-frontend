import { signal } from "@preact/signals";
import { isMobile } from "@/state/isMobile";

export const betSlipExpanded = signal<boolean>(!isMobile.value);