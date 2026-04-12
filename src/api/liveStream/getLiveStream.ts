import { instance } from "../instance";

export const getLiveStream = async () => {
  const res = await instance.get(`/fixtures/live-stream`);
  return res;
};