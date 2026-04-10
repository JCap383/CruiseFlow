import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

/**
 * Keeps the <html data-theme="..."> attribute in sync with the user's theme
 * preference. When set to "system", follows prefers-color-scheme live.
 */
export function useThemeController() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const applySystem = () => {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      root.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
    };

    if (theme === 'system') {
      applySystem();
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const listener = () => applySystem();
      mq.addEventListener?.('change', listener);
      return () => mq.removeEventListener?.('change', listener);
    }

    root.setAttribute('data-theme', theme);
  }, [theme]);
}
