import { useCallback, useEffect, useState } from 'react';
import {
  applyLanguageToDocument,
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  LANGUAGE_STORAGE_KEY,
  Language,
  normalizeLanguage,
} from '@/utils/language';

export const LANGUAGE_CHANGE_EVENT = 'language-change';

export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() =>
    getStoredLanguage()
  );

  const setLanguage = useCallback(
    (newLanguage: Language) => {
      if (typeof window === 'undefined' || newLanguage === language) return;

      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      applyLanguageToDocument(newLanguage);
      setLanguageState(newLanguage);

      window.dispatchEvent(
        new CustomEvent(LANGUAGE_CHANGE_EVENT, {
          detail: { language: newLanguage },
        })
      );
    },
    [language]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    applyLanguageToDocument(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncLanguage = (nextLanguage: Language) => {
      applyLanguageToDocument(nextLanguage);
      setLanguageState(nextLanguage);
    };

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ language?: Language }>;
      syncLanguage(normalizeLanguage(customEvent.detail?.language));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      syncLanguage(normalizeLanguage(event.newValue));
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    language,
    setLanguage,
    defaultLanguage: DEFAULT_LANGUAGE,
  };
};
