/** @jsxImportSource preact */
import { FunctionComponent } from 'preact';
import { useEffect } from 'preact/hooks';
import '@/styles/main.scss';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import { AppProviders } from './AppProviders';
import { I18nStore } from '@/shared/i18n/i18n';

interface AppRootProps {
  i18n: I18nStore;
  disallowUrlChange?: boolean;
}

export const AppRoot: FunctionComponent<AppRootProps> = ({ i18n, disallowUrlChange }) => {
  useEffect(() => {
    // Set Shoelace base path for CDN or local assets
    setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.1/cdn/');
    const styleEl = document.createElement("style");
    styleEl.setAttribute("id", "sb-parent-patches"); // optional marker
    styleEl.textContent = `
      div.bg-\\[var\\(--background\\)\\]{overflow-x: visible !important; overflow-y: visible !important;}
      div.flex-1.max-h-full.pl-2.md\\:pr-0.pr-2.body-content{overflow-x: visible !important; overflow-y: visible !important;}
      div.max-h-dvh.flex-col{height:auto!important;max-height:none!important;min-height:0!important;}
    `;

    document.head.appendChild(styleEl);

    return () => {
      styleEl.remove();
    };
  }, []);

  return <AppProviders i18n={i18n} disallowUrlChange={disallowUrlChange} />;
};
