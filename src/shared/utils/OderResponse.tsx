
export type OrderResponse = {
  sports: {
    id: string;
    name: string;
    order: number;
  }[];
  leagues: {
    live: {
      id: number;
      name: string;
      order: number;
      isActive: boolean;
      sportId: number;
      regionId: number;
    }[],
    prematch: {
      id: number;
      name: string;
      order: number;
      isActive: boolean;
      sportId: number;
      regionId: number;
    }[];
  };
  regions: {
    live: {
      id: number;
      name: string;
      order: number;
      isActive: boolean;
      sportId: number;
    }[],
    prematch: {
      id: number;
      name: string;
      order: number;
      isActive: boolean;
      sportId: number;
    }[]
  },
  featuredLeagues: {
    id: string;
    name: string;
    order: number;
  }[];
  featuredMatches: {
    id: string;
    name: string;
    order: number;
  }[];
  featuredOdds: {
    eventId: number;
    uuid: string;
    multiplier: number;
    order: number;
  }[];
};