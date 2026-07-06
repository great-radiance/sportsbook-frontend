import { FunctionComponent } from "preact";
import { Router, Route } from "wouter-preact";
import {
  useHashLocation,
  useMemoryLocationWithHistory,
} from "./ShadowLocation";
import { routes } from "./routes";
import { MainLayout } from "../layout/MainLayout";
import { useSportsbookStore } from "@/state/sportsbookStoreContext";
import { ROUTE_TYPE_TO_HOOK, type RouteType } from "./routeType";

interface RouterViewProps {
  routeType?: RouteType;
}

export const RouterView: FunctionComponent<RouterViewProps> = ({
  routeType = "memory",
}) => {
  const { locationHookType } = useSportsbookStore();
  locationHookType.value = ROUTE_TYPE_TO_HOOK[routeType];

  const layout = (
    <MainLayout>
      {routes.map((r) => (
        <Route key={r.path} path={r.path} component={r.component} />
      ))}
    </MainLayout>
  );

  if (routeType === "browser") {
    return <Router>{layout}</Router>;
  }

  const hook =
    routeType === "hash" ? useHashLocation : useMemoryLocationWithHistory;

  return <Router hook={hook}>{layout}</Router>;
};
