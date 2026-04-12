import { FunctionComponent } from "preact";
import { Router, Route } from "wouter-preact";
import {
  useHashLocation,
  useMemoryLocationWithHistory,
} from "./ShadowLocation";
import { routes } from "./routes";
import { MainLayout } from "../layout/MainLayout";
import { locationHookType } from "@/state/locationHookType";

interface RouterViewProps {
  disallowUrlChange?: boolean;
}

export const RouterView: FunctionComponent<RouterViewProps> = ({
  disallowUrlChange,
}) => {
  // Default to memory routing (true) if not explicitly set to false
  const useMemory = disallowUrlChange !== false;
  const hook = useMemory ? useMemoryLocationWithHistory : useHashLocation;
  locationHookType.value = useMemory
    ? "useMemoryLocationWithHistory"
    : "useHashLocation";

  return (
    <Router hook={hook}>
      <MainLayout>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} component={r.component} />
        ))}
      </MainLayout>
    </Router>
  );
};
