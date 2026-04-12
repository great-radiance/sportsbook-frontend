import { tStoiximanSidebarData } from "@/api/sidebar/apiGetStoiximanSidebar";
import { signal } from "@preact/signals";

export const stoiximanSidebarState = signal<tStoiximanSidebarData>([]);
