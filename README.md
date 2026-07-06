# Sportsbook SDK

A scalable, feature-based sportsbook application built with Preact, TypeScript, and Vite.

## Project Structure

```
src/
├─ app/                    # Application shell and routing
│  ├─ AppRoot.tsx         # Main sportsbook app root
│  ├─ AppProviders.tsx    # I18n, Router, etc.
│  ├─ router/             # Routing configuration
│  └─ layout/             # Layout components
│
├─ sdk/                   # SDK entry points
│  ├─ shadow/             # Shadow DOM SDK
│  └─ widgets/            # Widget SDKs
│
├─ features/              # Feature modules
│  ├─ disciplines/        # Sports disciplines feature
│  ├─ events/             # Events feature
│  ├─ auth/               # Authentication feature
│  └─ widgetTopEvents/    # Top events widget
│
├─ shared/                # Shared utilities and components
│  ├─ api/                # HTTP client and API types
│  ├─ config/             # Global configuration
│  ├─ i18n/               # Internationalization
│  ├─ routing/            # Route helpers
│  ├─ ui/                 # Shared UI components
│  └─ utils/              # Utility functions
│
├─ core/                  # Core initialization logic
│  ├─ sportsbookInit.ts   # Main app initialization
│  ├─ topEventsInit.ts    # Widget initialization
│  ├─ host.ts             # Shadow DOM handling
│  └─ theme.ts            # Theme management
│
└─ styles/                # Global styles
   └─ main.scss           # Tailwind + CSS vars
```

## Features

- **Feature-based architecture**: Organized by domain features for scalability
- **Shadow DOM support**: Can run in isolation with shadow DOM
- **Memory routing**: Supports memory-based routing for embedded widgets
- **Internationalization**: Rosetta-based i18n with JSON locale files
- **Type-safe API layer**: Axios-based HTTP client with TypeScript types
- **Multi-entry build**: Separate builds for main app and widgets

## Usage

### Main Sportsbook App

```typescript
import { initSportsbookApp } from './sdk/shadow';

const instance = window.Sportsbook.init({
  host: 'https://api.example.com',
  cid: 'partner-id',
  lang: 'en',
  containerId: 'sportsbook-container',
  routeType: "browser", // path-based routing for standalone sites
  allowToChangeParentStyles: false // Use shadow DOM
});

// Later, destroy
instance.destroy();
```

### Top Events Widget

```typescript
import { initTopEventsWidgetApp } from './sdk/widgets';

const instance = window.BetSdk.initTopEventsWidget({
  mainFrameUrl: 'https://example.com',
  host: 'https://api.example.com',
  cid: 'partner-id',
  lang: 'en',
  containerId: 'widget-container',
  height: '400px'
});
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Adding New Features

1. Create a new directory under `src/features/`
2. Add components, hooks, and API files as needed
3. Import and use in pages or widgets

## Adding New Languages

1. Create a new JSON file in `src/shared/i18n/locales/`
2. Add the import and entry to `src/shared/i18n/i18n.ts`
3. Use the `t()` function from `useI18n()` hook

## Routing

The app uses `wouter-preact` for routing with support for:
- Browser-based routing (default)
- Memory-based routing (`routeType: "memory"` for embedded widgets)
- Hash routing (`routeType: "hash"` for iframe / host hash sync)
- Browser routing (`routeType: "browser"` for standalone deployment)

Routes are configured in `src/app/router/routes.ts`.

