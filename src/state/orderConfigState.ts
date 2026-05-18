import { signal } from "@preact/signals";

/** Per-league ordering / visibility (optional CMS config). */
export type OrderConfigLeague = {
  order?: number;
  enabled?: boolean;
};

export type OrderConfigRegion = {
  order?: number;
  enabled?: boolean;
  leagues?: Record<string, OrderConfigLeague>;
};

/** Keyed by sport name or sport id string. */
export type OrderConfigSport = {
  order?: number;
  enabled?: boolean;
  regions?: Record<string, OrderConfigRegion>;
};

export type OrderConfigMap = Record<string, OrderConfigSport>;

/**
 * Display order for sports / regions / leagues.
 * Empty by default — sidebar order is used until order config is loaded.
 */
export const orderConfigState = signal<OrderConfigMap>({});
