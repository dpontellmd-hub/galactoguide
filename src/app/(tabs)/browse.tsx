import { Redirect } from 'expo-router';

/** Preserve old Browse links while Home serves as the single discovery destination. */
export default function BrowseRedirect() {
  return <Redirect href="/(tabs)/home" />;
}
