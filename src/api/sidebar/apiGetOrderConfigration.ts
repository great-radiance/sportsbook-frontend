import { instance } from "../instance";

export type tOrderConfigration = Record<
  string,
  {
    order: number;
    enabled: boolean;
    regions: Record<
      string,
      {
        order: number;
        enabled: boolean;
        leagues: Record<
          string,
          {
            order: number;
            enabled: boolean;
          }
        >;
      }
    >;
  }
>;

export const apiGetOrderConfigration = async () => {
  const res = await instance.get("/cybet/admin/ui-configuration/order-config");
  return res.data;
};
