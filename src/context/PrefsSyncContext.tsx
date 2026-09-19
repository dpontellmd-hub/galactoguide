import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { useSituations } from '@/context/SituationsContext';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import type { Portal, Situation } from '@/data/types';

// Debounce window for pushing local pref changes to the cloud.
const PUSH_DEBOUNCE_MS = 800;

interface PrefsRow {
  portal: Portal | null;
  disclaimer_accepted: boolean;
  situations: Situation[];
  updated_at: string;
}

/**
 * Syncs the locally-persisted portal + situations prefs to a per-user
 * `user_prefs` row using last-write-wins by `updated_at`.
 *
 * Logged out (or unconfigured), this is inert: PortalContext/SituationsContext
 * keep behaving exactly as before, all local-only. Must be nested *under*
 * AuthProvider, PortalProvider, and SituationsProvider.
 */
export function PrefsSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const portal = usePortal();
  const situations = useSituations();

  // The most recent timestamp we've reconciled with the server. Local changes
  // newer than this get pushed; applying a remote snapshot updates it so the
  // apply doesn't immediately bounce back as an upload.
  const syncedAtRef = useRef(0);
  const [reconciledUser, setReconciledUser] = useState<string | null>(null);
  const latest = useRef({ portal, situations });
  useEffect(() => { latest.current = { portal, situations }; }, [portal, situations]);

  const localUpdatedAt = Math.max(portal.updatedAt, situations.updatedAt);
  const ready =
    supabaseConfigured && !!userId && portal.hydrated && situations.hydrated;
  const scope = ready ? userId : null;
  const [syncScope, setSyncScope] = useState(scope);
  if (syncScope !== scope) {
    setSyncScope(scope);
    setReconciledUser(null);
  }

  // Reconcile on login (and whenever the signed-in user changes).
  useEffect(() => {
    if (!ready) {
      syncedAtRef.current = 0;
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('user_prefs')
        .select('portal, disclaimer_accepted, situations, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active || error) return;

      const current = latest.current;
      const local = Math.max(current.portal.updatedAt, current.situations.updatedAt);

      if (!data) {
        // No remote row yet — seed it from local.
        await pushLocal(userId!, current.portal, current.situations, local);
        if (!active) return;
        syncedAtRef.current = local;
        setReconciledUser(userId);
        return;
      }

      const row = data as PrefsRow;
      const remoteMs = Date.parse(row.updated_at) || 0;

      if (remoteMs > local) {
        // Remote is newer — adopt it locally.
        current.portal.applyRemotePrefs({
          portal: row.portal,
          disclaimerAccepted: row.disclaimer_accepted,
          updatedAt: remoteMs,
        });
        current.situations.applyRemoteSituations({
          situations: Array.isArray(row.situations) ? row.situations : [],
          updatedAt: remoteMs,
        });
        syncedAtRef.current = remoteMs;
      } else if (local > remoteMs) {
        // Local is newer — push it up.
        await pushLocal(userId!, current.portal, current.situations, local);
        if (!active) return;
        syncedAtRef.current = local;
      } else {
        syncedAtRef.current = remoteMs;
      }
      setReconciledUser(userId);
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, ready]);

  // Push subsequent local changes (debounced) while logged in.
  useEffect(() => {
    if (!ready || reconciledUser !== userId) return;
    if (localUpdatedAt <= syncedAtRef.current) return;

    let active = true;
    const pushTimer = setTimeout(() => {
      const stamp = localUpdatedAt;
      const current = latest.current;
      pushLocal(userId!, current.portal, current.situations, stamp)
        .then(() => {
          if (active) syncedAtRef.current = Math.max(syncedAtRef.current, stamp);
        })
        .catch(() => {});
    }, PUSH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(pushTimer);
    };
  }, [userId, localUpdatedAt, ready, reconciledUser]);

  return <>{children}</>;
}

async function pushLocal(
  userId: string,
  portal: ReturnType<typeof usePortal>,
  situations: ReturnType<typeof useSituations>,
  updatedAtMs: number,
): Promise<void> {
  const { error } = await supabase.from('user_prefs').upsert(
    {
      user_id: userId,
      portal: portal.portal,
      disclaimer_accepted: portal.disclaimerAccepted,
      situations: situations.situations,
      updated_at: new Date(updatedAtMs || Date.now()).toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
