import { instance } from "./instance";

export const apiGetTranslate = async (en: string, lang: string) => {
  const response = await instance.get(
    `/cybet/translation/translate?text=${en}&lang=${lang}`,
  );
  return response.data;
};
