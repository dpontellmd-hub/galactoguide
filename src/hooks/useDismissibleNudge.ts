import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'galactoguide.nudge.';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DismissibleNudge {
  /** True once the dismissal record has loaded AND the nudge is not snoozed. */
  visible: boolean;
  /** True once AsyncStorage has been read (avoids a flash before we know). */
  hydrated: boolean;
  /** Hide the nudge and snooze it for `cooldownDays`. */
  dismiss: () => void;
}

/**
 * A nudge the user can dismiss, that quietly comes back after a cooldown.
 *
 * We persist the dismissed-at timestamp (epoch ms) under
 * `galactoguide.nudge.<key>`. The nudge is hidden while
 * `now - dismissedAt < cooldownDays`, then becomes visible again — so a
 * dismissal is a snooze, not a permanent opt-out.
 */
export function useDismissibleNudge(key: string, cooldownDays = 14): DismissibleNudge {
  const storageKey = KEY_PREFIX + key;
  const [hydrated, setHydrated] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const dismissedAt = raw ? Number(raw) : 0;
        if (active && dismissedAt) {
          setSnoozed(Date.now() - dismissedAt < cooldownDays * MS_PER_DAY);
        }
      } catch {
        // Missing/corrupt storage — treat as never dismissed.
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey, cooldownDays]);

  const dismiss = useCallback(() => {
    setSnoozed(true);
    AsyncStorage.setItem(storageKey, String(Date.now())).catch(() => {});
  }, [storageKey]);

  return { visible: hydrated && !snoozed, hydrated, dismiss };
}
