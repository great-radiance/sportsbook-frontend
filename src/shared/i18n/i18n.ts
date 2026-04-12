import rosetta, { Rosetta } from 'rosetta';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import tr from './locales/tr.json';
import az from './locales/az.json';
import ru from './locales/ru.json';
import el from './locales/el.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import fr from './locales/fr.json';
import he from './locales/he.json';
import fa from './locales/fa.json';
import ar from './locales/ar.json';

export type Messages = Record<string, any>;

const dictionaries: Record<string, Messages> = {
  en,
  de,
  es,
  tr,
  az,
  ru,
  el,
  pt,
  it,
  fr,
  he,
  fa,
  ar,
};

export interface I18nStore {
  ros: Rosetta<Messages>;
  t: (key: string) => string;
  setLocale: (lang: string) => void;
  getLocale: () => string;
}

export function createI18nStore(lang: string): I18nStore {
  const ros = rosetta<Messages>();
  const chosen = dictionaries[lang] ? lang : 'en';
  ros.set(chosen, dictionaries[chosen]);
  ros.locale(chosen);

  return {
    ros,
    t: (key) => ros.t(key) || key,
    setLocale(next) {
      if (!dictionaries[next]) return;
      ros.set(next, dictionaries[next]);
      ros.locale(next);
    },
    getLocale() {
      return ros.locale() as string;
    }
  };
}

export const I18nContext = createContext<I18nStore | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('I18nContext not found');
  }
  return ctx;
}

/**
 * Returns a namespaced `t` so you can use short keys.
 * e.g. useTranslate('sidebar') then t('searchPlaceholder') → same as t('sidebar.searchPlaceholder')
 */
export function useTranslate(namespace: string) {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('I18nContext not found');
  }
  const prefix = namespace ? `${namespace}.` : '';
  return {
    t: (key: string) => ctx.t(prefix + key),
  };
}