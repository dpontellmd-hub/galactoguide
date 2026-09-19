import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SubstanceKind } from '@/data/types';
import {
  getPushPermission,
  registerForPushNotificationsAsync,
  type PushPermission,
} from '@/lib/notifications';

const STORAGE_KEY = 'galactoguide.notifications.v1';

interface PersistedState {
  enabled: boolean;
}

interface NotificationsContextValue {
  /** User's opt-in choice (persisted). */
  enabled: boolean;
  /** OS-level permission status. */
  permission: PushPermission;
  /** Expo push token once obtained (null on web/simulator or before opt-in). */
  token: string | null;
  /** True until persisted opt-in has loaded. */
  hydrated: boolean;
  /** True while a permission request / token fetch is in flight. */
  busy: boolean;
  /** Opt in: request permission + fetch token. Returns true on success. */
  enable: () => Promise<boolean>;
  /** Opt out locally (cannot revoke the OS permission). */
  disable: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hydrate opt-in + current permission; refresh the token if still opted in.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const wasEnabled = raw ? (JSON.parse(raw) as PersistedState).enabled : false;
        const perm = await getPushPermission();
        if (!active) return;
        setPermission(perm);
        setEnabled(wasEnabled);
        if (wasEnabled && perm === 'granted') {
          const t = await registerForPushNotificationsAsync();
          if (active && t) setToken(t);
        }
      } catch {
        // Start fresh on any error.
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Route to a substance when a notification carrying { substanceId, kind } is
  // tapped — both while running and from a cold start.
  useEffect(() => {
    const routeFrom = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        | { substanceId?: string; kind?: SubstanceKind }
        | undefined;
      if (data?.substanceId) {
        router.push({
          pathname: '/substance/[id]',
          params: { id: data.substanceId, kind: data.kind ?? 'gogue' },
        });
      }
    };
    Notifications.getLastNotificationResponseAsync().then(routeFrom).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(routeFrom);
    return () => sub.remove();
  }, [router]);

  const persist = (next: boolean) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: next } as PersistedState)).catch(
      () => {},
    );

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const t = await registerForPushNotificationsAsync();
      const perm = await getPushPermission();
      setPermission(perm);
      const ok = perm === 'granted';
      setEnabled(ok);
      setToken(t);
      persist(ok);
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    setToken(null);
    persist(false);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ enabled, permission, token, hydrated, busy, enable, disable }),
    [enabled, permission, token, hydrated, busy, enable, disable],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}
