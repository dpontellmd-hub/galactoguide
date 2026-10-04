import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppUpdates } from '@/lib/useAppUpdates';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Floating "update available" banner (the prompt-to-reload OTA flow). Renders
 * nothing until an update has been downloaded and is ready. Mounted once at the
 * app root so it can appear over any screen.
 */
export function UpdateBanner() {
  const { isUpdatePending, reload } = useAppUpdates();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);

  if (!isUpdatePending || dismissed) return null;

  const onReload = async () => {
    setReloading(true);
    await reload();
  };

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}
      accessibilityRole="alert"
      accessibilityLabel="A new version of GalactoGuide is ready"
    >
      <View style={styles.card}>
        <Ionicons name="sparkles" size={17} color={colors.terra} />
        <Text style={styles.text} numberOfLines={1}>
          A new version is ready
        </Text>
        <Pressable
          onPress={onReload}
          disabled={reloading}
          style={styles.reloadBtn}
          accessibilityRole="button"
          accessibilityLabel="Reload to apply the update"
        >
          {reloading ? (
            <ActivityIndicator size="small" color={colors.ink.fg} />
          ) : (
            <Text style={styles.reloadText}>Reload</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.lg,
      zIndex: 1000,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      elevation: 8,
      boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.18)',
    },
    text: { ...font.semibold, flex: 1, fontSize: fontSize.body, lineHeight: 20, color: colors.text },
    reloadBtn: {
      backgroundColor: colors.ink.bg,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    reloadText: { ...font.bold, fontSize: fontSize.small, color: colors.ink.fg },
    closeBtn: { padding: 2 },
  });
