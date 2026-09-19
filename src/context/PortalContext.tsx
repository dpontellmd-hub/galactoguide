import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Portal } from '@/data/types';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'galactoguide.session.v2';

interface PersistedSession {
  portal: Portal | null;
  disclaimerAccepted: boolean;
  /** Epoch ms of the last local change — drives last-write-wins cloud sync. */
  updatedAt?: number;
}

/** Remote snapshot applied on login (see PrefsSyncContext). */
export interface RemotePortalPrefs {
  portal: Portal | null;
  disclaimerAccepted: boolean;
  updatedAt: number;
}

interface PortalContextValue {
  /** Selected portal, or null if not yet chosen. */
  portal: Portal | null;
  /** Whether the user has accepted the disclaimer for the current portal. */
  disclaimerAccepted: boolean;
  /** True until persisted session has loaded (avoids a flash of the wrong screen). */
  hydrated: boolean;
  /** Epoch ms of the last local change (0 if never changed). */
  updatedAt: number;
  isMother: boolean;
  /** Choose a portal (does not accept the disclaimer). */
  selectPortal: (p: Portal) => void;
  /** Mark the disclaimer accepted for the current portal. */
  acceptDisclaimer: () => void;
  /** Reset to the welcome flow (Switch portal). */
  resetPortal: () => void;
  /** Apply a newer remote snapshot without re-stamping updatedAt (cloud sync). */
  applyRemotePrefs: (remote: RemotePortalPrefs) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const { user, hydrated: authHydrated } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = authHydrated ? `${STORAGE_KEY}:${userId ?? 'guest'}` : null;
  const [portal, setPortal] = useState<Portal | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const hydrated = storageKey !== null && loadedKey === storageKey;
  const [scope, setScope] = useState(storageKey);
  if (scope !== storageKey) {
    setScope(storageKey);
    setLoadedKey(null);
    setPortal(null);
    setDisclaimerAccepted(false);
    setUpdatedAt(0);
  }

  // Keep account preferences separate from each other and from guest browsing.
  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(storageKey);
        // Only the non-clinical guest portal/disclaimer can use the old cache.
        // Unowned favorites and situations are never imported into an account.
        if (!raw && !userId) raw = await AsyncStorage.getItem('galactoguide.session.v1');
        if (active && raw) {
          const parsed = JSON.parse(raw) as PersistedSession;
          setPortal(parsed.portal ?? null);
          setDisclaimerAccepted(Boolean(parsed.disclaimerAccepted));
          setUpdatedAt(parsed.updatedAt ?? 0);
        }
      } catch {
        // Ignore corrupt/missing storage — start fresh.
      } finally {
        if (active) setLoadedKey(storageKey);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey, userId]);

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated || !storageKey) return;
    const session: PersistedSession = { portal, disclaimerAccepted, updatedAt };
    AsyncStorage.setItem(storageKey, JSON.stringify(session)).catch(() => {});
  }, [portal, disclaimerAccepted, updatedAt, hydrated, storageKey]);

  const value = useMemo<PortalContextValue>(
    () => ({
      portal: hydrated ? portal : null,
      disclaimerAccepted: hydrated && disclaimerAccepted,
      hydrated,
      updatedAt: hydrated ? updatedAt : 0,
      isMother: hydrated && portal === 'mother',
      selectPortal: (p) => {
        setPortal(p);
        setDisclaimerAccepted(false);
        setUpdatedAt(Date.now());
      },
      acceptDisclaimer: () => {
        setDisclaimerAccepted(true);
        setUpdatedAt(Date.now());
      },
      resetPortal: () => {
        setPortal(null);
        setDisclaimerAccepted(false);
        setUpdatedAt(Date.now());
      },
      applyRemotePrefs: (remote) => {
        setPortal(remote.portal);
        setDisclaimerAccepted(remote.disclaimerAccepted);
        setUpdatedAt(remote.updatedAt);
      },
    }),
    [portal, disclaimerAccepted, hydrated, updatedAt],
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return ctx;
}
