export type Language = 'zh-CN' | 'en';

export const LANGUAGE_STORAGE_KEY = 'language';
export const DEFAULT_LANGUAGE: Language = 'zh-CN';

export const normalizeLanguage = (value: string | null | undefined): Language =>
  value === 'en' ? 'en' : DEFAULT_LANGUAGE;

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

export const isChineseLanguage = (language: Language) => language === 'zh-CN';

export const applyLanguageToDocument = (language: Language) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
};

export const getLocalizedSvgPath = (
  path: string,
  language: Language = getStoredLanguage()
) => {
  if (language === DEFAULT_LANGUAGE) return path;
  return path.replace(/\.svg$/, '.en.svg');
};
