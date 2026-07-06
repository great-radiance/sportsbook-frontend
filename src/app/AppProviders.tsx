/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { I18nContext, I18nStore } from "@/shared/i18n/i18n";
import { RouterView } from "./router/RouterView";
import { SocketProvider } from "@/context/SocketContext";
import { SportsbookProvider } from "@/context/SportsbookContext";
import type { RouteType } from "./router/routeType";

interface AppProvidersProps {
  i18n: I18nStore;
  routeType?: RouteType;
}

export const AppProviders: FunctionComponent<AppProvidersProps> = ({
  i18n,
  routeType,
}) => {
  return (
    <SportsbookProvider>
      <I18nContext.Provider value={i18n}>
        <SocketProvider>
          <RouterView routeType={routeType} />
        </SocketProvider>
      </I18nContext.Provider>
    </SportsbookProvider>
  );
};
