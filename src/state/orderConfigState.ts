import { signal } from "@preact/signals";
import { tOrderConfigration } from "../api/sidebar/apiGetOrderConfigration";

export const orderConfigState = signal<tOrderConfigration>({});
