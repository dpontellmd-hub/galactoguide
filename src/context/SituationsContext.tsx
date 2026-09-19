import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Situation } from '@/data/types';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'galactoguide.situations.v2';

interface PersistedSituations {
  situations: Situation[];
  /** Epoch ms of the last local change — drives last-write-wins cloud sync. */
  updatedAt?: number;
}

/** Remote snapshot applied on login (see PrefsSyncContext). */
export interface RemoteSituations {
  situations: Situation[];
  updatedAt: number;
}

interface SituationsContextValue {
  /** The user's saved clinical situations (may be empty). */
  situations: Situation[];
  /** True until persisted situations have loaded (avoids a flash of un-badged cards). */
  hydrated: boolean;
  /** Epoch ms of the last local change (0 if never changed). */
  updatedAt: number;
  /** Replace the whole selection. */
  setSituations: (s: Situation[]) => void;
  /** Add/remove a single situation. */
  toggleSituation: (s: Situation) => void;
  /** Clear all situations. */
  clearSituations: () => void;
  /** Apply a newer remote snapshot without re-stamping updatedAt (cloud sync). */
  applyRemoteSituations: (remote: RemoteSituations) => void;
}

const SituationsContext = createContext<SituationsContextValue | null>(null);

export function SituationsProvider({ children }: { children: ReactNode }) {
  const { user, hydrated: authHydrated } = useAuth();
  const storageKey = authHydrated ? `${STORAGE_KEY}:${user?.id ?? 'guest'}` : null;
  const [situations, setSituationsState] = useState<Situation[]>([]);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const hydrated = storageKey !== null && loadedKey === storageKey;
  const [scope, setScope] = useState(storageKey);
  if (scope !== storageKey) {
    setScope(storageKey);
    setLoadedKey(null);
    setSituationsState([]);
    setUpdatedAt(0);
  }

  // The old v1 cache had no owner. Restore account data from Supabase instead
  // of attributing a previous browser user's clinical selections to this user.
  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (active && raw) {
          const parsed = JSON.parse(raw) as PersistedSituations;
          if (Array.isArray(parsed.situations)) setSituationsState(parsed.situations);
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
  }, [storageKey]);

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated || !storageKey) return;
    const payload: PersistedSituations = { situations, updatedAt };
    AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
  }, [situations, updatedAt, hydrated, storageKey]);

  const value = useMemo<SituationsContextValue>(
    () => ({
      situations: hydrated ? situations : [],
      hydrated,
      updatedAt: hydrated ? updatedAt : 0,
      setSituations: (s) => {
        setSituationsState(s);
        setUpdatedAt(Date.now());
      },
      toggleSituation: (s) => {
        setSituationsState((prev) =>
          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
        );
        setUpdatedAt(Date.now());
      },
      clearSituations: () => {
        setSituationsState([]);
        setUpdatedAt(Date.now());
      },
      applyRemoteSituations: (remote) => {
        setSituationsState(remote.situations);
        setUpdatedAt(remote.updatedAt);
      },
    }),
    [situations, hydrated, updatedAt],
  );

  return (
    <SituationsContext.Provider value={value}>{children}</SituationsContext.Provider>
  );
}

export function useSituations(): SituationsContextValue {
  const ctx = useContext(SituationsContext);
  if (!ctx) {
    throw new Error('useSituations must be used within a SituationsProvider');
  }
  return ctx;
}
