/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_HOST?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PARTNER_ID?: string;
  readonly VITE_API_TOKEN?: string;
  readonly VITE_DEFAULT_LANG?: string;
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Shoelace component type declarations - catch-all for all sl-* tags
import 'preact';

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      // Common Shoelace components
      'sl-carousel': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-carousel-item': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-icon': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-icon-button': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-button': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-input': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-dialog': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-select': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-option': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-menu': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-menu-item': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-dropdown': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tooltip': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-card': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-badge': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-alert': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-spinner': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-progress-bar': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-progress-ring': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tab': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tab-group': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tab-panel': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-avatar': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-checkbox': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-radio': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-radio-group': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-switch': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-textarea': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-range': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-rating': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-skeleton': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-divider': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-details': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-drawer': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-popup': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-split-panel': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tag': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tree': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      'sl-tree-item': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, any>;
      // Add more as needed - this covers the most common ones
    }
  }
}