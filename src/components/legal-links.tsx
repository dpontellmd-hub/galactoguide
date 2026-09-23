import { Link, type Href } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { publicUrl, webPath } from '@/lib/site';
import { font, fontSize, spacing, useThemedStyles, type ThemeColors } from '@/theme';

/** Static documents open separately so reading a policy doesn't discard a form. */
export function LegalLinks() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      {([['privacy.html', 'Privacy Policy'], ['terms.html', 'Terms of Use']] as const).map(([path, label]) => (
        <Link key={path} href={(Platform.OS === 'web' ? webPath(path) : publicUrl(path)) as Href}
          target="_blank" rel="noopener noreferrer" style={styles.link}>
          {label}
        </Link>
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.xl, marginTop: spacing.md },
  link: { ...font.semibold, fontSize: fontSize.body, color: colors.textSecondary, textDecorationLine: 'underline', paddingVertical: 14 },
});
