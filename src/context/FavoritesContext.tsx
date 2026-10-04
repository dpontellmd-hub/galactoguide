import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'galactoguide.favorites.v2';
const EMPTY_FAVORITES = new Set<string>();

interface PersistedFavorites {
  ids: string[];
}

interface FavoritesContextValue {
  /** Saved substance ids for the signed-in account. Empty while signed out. */
  favorites: Set<string>;
  /** True until persisted favorites have loaded. */
  hydrated: boolean;
  isFavorite: (id: string) => boolean;
  /** Add/remove a substance for the signed-in account. No-op while signed out. */
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, hydrated: authHydrated } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = authHydrated ? `${STORAGE_KEY}:${userId ?? 'guest'}` : null;

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const hydrated = storageKey !== null && loadedKey === storageKey;
  const [scope, setScope] = useState(storageKey);
  // Reset before children render, including a rapid A -> B -> A switch while
  // storage is still loading. Old data must never be persisted under a new key.
  if (scope !== storageKey) {
    setScope(storageKey);
    setLoadedKey(null);
    setFavorites(new Set());
  }

  // v1 had no owner, so it cannot safely be imported into any account. Existing
  // account saves are restored from Supabase; each account gets its own cache.
  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    (async () => {
      try {
        const raw = userId ? await AsyncStorage.getItem(storageKey) : null;
        if (active && raw) {
          const parsed = JSON.parse(raw) as PersistedFavorites;
          if (Array.isArray(parsed.ids)) setFavorites(new Set(parsed.ids.filter((id) => typeof id === 'string')));
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

  // Persist locally on change (after hydration).
  useEffect(() => {
    if (!hydrated || !storageKey || !userId) return;
    const payload: PersistedFavorites = { ids: [...favorites] };
    AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
  }, [favorites, hydrated, storageKey, userId]);

  // On login: union remote ∪ local (favorites are additive, so union never loses
  // a save), push this account's local-only ids, and adopt the merged set.
  useEffect(() => {
    if (!hydrated || !userId || !supabaseConfigured) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('substance_id')
        .eq('user_id', userId);
      if (!active || error || !data) return;

      const remote = new Set(data.map((r) => r.substance_id as string));
      const localOnly = [...favorites].filter((id) => !remote.has(id));

      if (localOnly.length > 0) {
        await supabase
          .from('favorites')
          .upsert(
            localOnly.map((substance_id) => ({ user_id: userId, substance_id })),
            { onConflict: 'user_id,substance_id' },
          );
      }

      if (!active) return;
      setFavorites((prev) => new Set([...prev, ...remote]));
    })().catch(() => {});
    return () => {
      active = false;
    };
    // Re-run only when the signed-in user changes (not on every favorite toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hydrated]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites: userId && hydrated ? favorites : EMPTY_FAVORITES,
      hydrated,
      isFavorite: (id) => Boolean(userId && hydrated && favorites.has(id)),
      toggleFavorite: (id) => {
        if (!userId || !hydrated) return;

        setFavorites((prev) => {
          const next = new Set(prev);
          const adding = !next.has(id);
          if (adding) next.add(id);
          else next.delete(id);

          // Fire-and-forget remote sync for the signed-in account.
          if (supabaseConfigured) {
            if (adding) {
              supabase
                .from('favorites')
                .upsert({ user_id: userId, substance_id: id }, { onConflict: 'user_id,substance_id' })
                .then(undefined, () => {});
            } else {
              supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('substance_id', id)
                .then(undefined, () => {});
            }
          }
          return next;
        });
      },
    }),
    [favorites, hydrated, userId],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}
