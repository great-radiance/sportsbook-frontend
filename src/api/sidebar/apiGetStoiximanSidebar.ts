import { instance } from "../instance";

export type tStoiximanSidebarItem = {
  id: number;
  order: number;
  name: string;
  type: string;
  origin?: string;
  parent: number;
  events?: number[];
  children?: tStoiximanSidebarItem[];
};

//soccer:rest of the world:18:Liberia
//volleyball:20:Faroe Islands
//Golf:2:DP World Tour
//24:Moto GP 32:Floorball

export type tStoiximanSidebarData = tStoiximanSidebarItem[];

export const apiGetStoiximanSidebar = async () => {
  const response =
    await instance.get<tStoiximanSidebarData>(`/cybet/sidebar/tree`);
  return response.data;
};
