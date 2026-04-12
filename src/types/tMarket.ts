export type tMarket = {
  marketSlug: string;
  eventType: "preGame" | "inPlay";
  marketInfo: {
    column: number;
    groups: number[];
    id: number;
    name_template: string;
    numbers: number[];
    sort: number;
    uni_name: string;
    category: string;
    betradar_id: number;
  };
};
