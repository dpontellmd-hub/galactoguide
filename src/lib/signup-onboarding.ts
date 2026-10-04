import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Portal, Situation } from '@/data/types';

/** Seed only the pending signup's empty cache, before verification emits a session.
 * Never copy guest caches, favorites, or disclaimer acceptance into an account.
 */
export async function prepareSignupOnboarding(userId: string, portal: Portal, situations: Situation[]) {
  const updatedAt = Date.now();
  const entries = [
    [`galactoguide.session.v2:${userId}`, { portal, disclaimerAccepted: false, updatedAt }],
    [`galactoguide.situations.v2:${userId}`, { situations, updatedAt }],
  ] as const;
  await Promise.all(entries.map(async ([key, value]) => {
    if (await AsyncStorage.getItem(key) === null) {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    }
  }));
}
