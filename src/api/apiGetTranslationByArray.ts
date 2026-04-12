import { getAppConfig } from "@/shared/config/appConfig";
import { instance } from "./instance";

export const apiGetTranslationByArray = async (array: string[]) => {
  const { lang } = getAppConfig();

  const response = await instance.post("cybet/translation/translate-map", {
    lang: lang,
    sourceTexts: array,
  });
  return response.data;
};
