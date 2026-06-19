/** @jsxImportSource preact */
import { FunctionComponent } from "preact";
import { I18nContext, I18nStore } from "@/shared/i18n/i18n";
import { RouterView } from "./router/RouterView";
import { SocketProvider } from "@/context/SocketContext";
import { useEffect } from "preact/hooks";
import { getAppConfig } from "@/shared/config/appConfig";
import { SportsbookProvider } from "@/context/SportsbookContext";

interface AppProvidersProps {
  i18n: I18nStore;
  disallowUrlChange?: boolean;
}

export const AppProviders: FunctionComponent<AppProvidersProps> = ({
  i18n,
  disallowUrlChange,
}) => {
  return (
    <SportsbookProvider>
      <I18nContext.Provider value={i18n}>
        <SocketProvider>
          <RouterView disallowUrlChange={false} />
        </SocketProvider>
      </I18nContext.Provider>
    </SportsbookProvider>
  );
};
