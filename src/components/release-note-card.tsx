import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReleaseNote } from '@/data/release-notes';
import { font, fontSize, spacing, useThemedStyles, type ThemeColors } from '@/theme';

export function ReleaseNoteCard({ release, latest = false, children }: {
  release: ReleaseNote;
  latest?: boolean;
  children?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        {latest && <Text style={styles.eyebrow}>LATEST RELEASE</Text>}
        <Text style={styles.version} accessibilityRole="header" selectable>
          Version {release.version}
        </Text>
        <Text style={styles.summary} selectable>{release.summary}</Text>
      </View>
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  copy: { padding: 18, gap: spacing.sm },
  eyebrow: { ...font.semibold, fontSize: fontSize.small, letterSpacing: 0.6, color: colors.accent },
  version: { ...font.extrabold, fontSize: fontSize.lg, color: colors.text },
  summary: { ...font.regular, fontSize: 15, lineHeight: 24, color: colors.textSecondary },
});
