import { useState, useEffect, useCallback } from 'react';
import { MAP_TILE_STYLE_LIGHT, MAP_TILE_STYLE_DARK } from '@/utils/const';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'theme';

// Custom event name for theme changes
export const THEME_CHANGE_EVENT = 'theme-change';

export const normalizeTheme = (value: string | null | undefined): Theme =>
  value === 'light' ? 'light' : 'dark';

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';

  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') {
    return dataTheme;
  }

  return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
};

export const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
};

/**
 * Converts a theme value to the corresponding map style
 * @param theme - The current theme ('light' or 'dark')
 * @returns The appropriate map style for the theme
 */
export const getMapThemeFromCurrentTheme = (theme: Theme): string => {
  if (theme === 'dark') return MAP_TILE_STYLE_DARK;
  return MAP_TILE_STYLE_LIGHT;
};

/**
 * Hook for managing map theme based on application theme
 * @returns The current map theme style
 */
export const useMapTheme = () => {
  // Initialize map theme based on current settings, default to dark
  const [mapTheme, setMapTheme] = useState(() =>
    getMapThemeFromCurrentTheme(getStoredTheme())
  );

  /**
   * Ensures map theme is consistent with application theme
   */
  const ensureThemeConsistency = useCallback(() => {
    if (typeof window === 'undefined') return;

    const newTheme = getMapThemeFromCurrentTheme(getStoredTheme());

    // Only update if theme has changed
    if (mapTheme !== newTheme) {
      setMapTheme(newTheme);
    }
  }, [mapTheme]);

  // Set up listeners for various theme change events
  useEffect(() => {
    // Watch for DOM attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          ensureThemeConsistency();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Listen for custom theme change events
    const handleThemeChange = () => ensureThemeConsistency();
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    // Listen for localStorage changes (for multi-tab support)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        handleThemeChange();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial check
    ensureThemeConsistency();

    // Clean up all listeners
    return () => {
      observer.disconnect();
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [ensureThemeConsistency]);

  return mapTheme;
};

/**
 * Main theme hook for the application
 * @returns Object with current theme and function to change theme
 */
export const useTheme = () => {
  // Initialize theme from localStorage or default to dark
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  /**
   * Set theme and dispatch event to notify other components
   */
  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined' || newTheme === theme) return;

    applyThemeToDocument(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);

    // Dispatch custom event for theme change
    const event = new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme: newTheme },
    });
    window.dispatchEvent(event);
  }, [theme]);

  // Apply theme changes to DOM and localStorage
  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (nextTheme: Theme) => {
      applyThemeToDocument(nextTheme);
      setThemeState(nextTheme);
    };

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: Theme }>;
      syncTheme(normalizeTheme(customEvent.detail?.theme));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      syncTheme(normalizeTheme(event.newValue));
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    theme,
    setTheme,
  };
};

/**
 * Hook to trigger re-render when theme changes for dynamic color calculations
 * @returns A counter that increments when theme changes
 */
export const useThemeChangeCounter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => {
      setCounter((prev) => prev + 1);
    };

    // Listen for DOM attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Listen for custom theme change events
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    // Listen for localStorage changes (for multi-tab support)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        handleThemeChange();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return counter;
};
