import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/** Open an external URL in the in-app browser (or a new tab on web). */
export async function openExternal(url: string) {
  if (Platform.OS === 'web') {
    // window is available on web; open in a new tab.
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // Swallow — opening a browser should never crash the app.
  }
}
