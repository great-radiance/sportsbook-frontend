import { getAppConfig } from "@/shared/config/appConfig";
import { apiGetTranslationByArray } from "@/api/apiGetTranslationByArray";
import { translationState } from "@/state/translationState";

/** Returns translated text from translationState; use in render so component re-renders when translations load. */
export const getTranslatedText = (text: string): string => {
  if (!text) return text;
  if (getAppConfig().lang === "en") return text;
  return translationState.value.translations[text] || text;
};

export const getTranslate = async (texts: string[]) => {
  const lang = getAppConfig().lang;
  if (lang === "en") return;
  if (lang === translationState.value.lang)
    texts = texts.filter((text) => !translationState.value.translations[text]);
  if (texts.length === 0) return;
  const response = await apiGetTranslationByArray(texts);
  translationState.value = {
    lang,
    translations:
      lang === translationState.value.lang
        ? { ...translationState.value.translations, ...response.translations }
        : response.translations,
  };
  translationState.value = { ...translationState.value };
};
