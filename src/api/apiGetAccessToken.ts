import { instance } from "./instance";

export const apiGetAccessToken = async () => {
  const res = await instance.get(`/cybet/fixtures/access-token`);
  return res.data;
};