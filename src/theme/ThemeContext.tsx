import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';

const STORAGE_KEY = 'galactoguide.theme.v1';

/** User's appearance choice. `system` follows the OS/browser setting. */
export type ThemePreference = 'system' | 'light' | 'dark';
/** The resolved scheme actually rendered. */
export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  /** Active color tokens (light or dark). */
  colors: ThemeColors;
  /** Resolved scheme being rendered. */
  scheme: ColorScheme;
  isDark: boolean;
  /** The user's stored preference (may be `system`). */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** True once the persisted preference has loaded. */
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && (raw === 'system' || raw === 'light' || raw === 'dark')) {
          setPreferenceState(raw);
        }
      } catch {
        // Ignore corrupt/missing storage — fall back to light mode.
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return {
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      isDark: scheme === 'dark',
      preference,
      hydrated,
      setPreference: (p) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, systemScheme, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

/**
 * Build a memoized StyleSheet from the active theme. Pass a module-level
 * factory (stable reference) so styles only rebuild when the theme changes:
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
