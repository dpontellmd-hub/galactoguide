// Supabase client. `react-native-url-polyfill/auto` MUST be imported before
// `createClient` — supabase-js relies on a spec-compliant URL on React Native.
// It's a no-op on web.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Credentials live in app.json `expo.extra` (inlined into the static web bundle).
// `EXPO_PUBLIC_*` env vars override them for local dev. The anon/publishable key
// is client-safe by design — Row-Level Security enforces access, there is no server.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

/** True once real credentials are configured (not the app.json placeholders). */
export const supabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.startsWith('YOUR_');

if (!supabaseConfigured && __DEV__) {
  console.warn(
    '[supabase] Missing credentials. Set expo.extra.supabaseUrl / supabaseAnonKey ' +
      'in app.json (or EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). ' +
      'Auth features are disabled until configured.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-placeholder',
  {
    auth: {
      // Native persists the session via AsyncStorage; on web supabase-js falls
      // back to localStorage (leave `storage` undefined).
      storage: isWeb ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Web OAuth + password-recovery return a PKCE code in the redirect URL and
      // supabase-js must auto-consume it. Native uses a deep link instead, where
      // parsing the app URL here would be wrong — so this is web-only.
      detectSessionInUrl: isWeb,
      flowType: 'pkce',
    },
  },
);

// Native only: pause/resume the token-refresh timer with foreground state, per
// Supabase's Expo guide. (No-op on web.)
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
