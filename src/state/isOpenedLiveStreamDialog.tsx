import { signal } from "@preact/signals";

export const isOpenedLiveStreamDialog = signal<boolean>(false);
export const liveStreamUrl = signal<string>('');