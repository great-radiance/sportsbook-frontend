/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { EventView } from "@/app/pages/EventView";
import { Results } from "@/app/pages/Results";
import { Test } from "@/app/pages/Test";

export interface RouteConfig {
  path: string;
  component: FunctionComponent;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    component: EventView,
  },
  {
    path: "/event-view/:rest*",
    component: EventView,
  },
  {
    path: "/results/:rest*",
    component: Results,
  },
  {
    path: "/test/:rest*",
    component: Test,
  },
];
