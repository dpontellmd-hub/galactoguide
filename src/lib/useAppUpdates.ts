import * as Updates from 'expo-updates';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * OTA-update controller for the "prompt to reload" flow.
 *
 * Cold-start checks are handled natively by `updates.checkAutomatically: ON_LOAD`
 * (configured in app.json): a newer update is downloaded in the background and
 * becomes a *pending* update that applies on the next launch. This hook adds a
 * re-check whenever the app returns to the foreground (covers long sessions),
 * and surfaces `isUpdatePending` so the UI can offer an immediate reload.
 *
 * Everything is gated on `Updates.isEnabled`, so it's a no-op in dev, on web,
 * and until `eas update:configure` has wired up the update URL.
 */
export function useAppUpdates() {
  const { isUpdatePending, isDownloading, isChecking, downloadError, checkError } =
    Updates.useUpdates();

  const checkAndDownload = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch {
      // Offline or transient server error — try again on the next foreground.
    }
  }, []);

  // Re-check on foreground. (Cold starts are already covered by ON_LOAD.)
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAndDownload();
    });
    return () => sub.remove();
  }, [checkAndDownload]);

  const reload = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // If reload fails the update still applies on the next natural launch.
    }
  }, []);

  return {
    /** A new update has been downloaded and is ready to apply on reload. */
    isUpdatePending,
    isDownloading,
    isChecking,
    /** Restart into the downloaded update. */
    reload,
    error: downloadError ?? checkError,
  };
}
