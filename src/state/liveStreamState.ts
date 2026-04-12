import { LiveStreamDataMap } from "@/shared/utils/liveStream";
import { signal } from "@preact/signals";

export const liveStreamState = signal<LiveStreamDataMap>({});