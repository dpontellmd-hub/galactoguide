import { StyleSheet, Text, View } from 'react-native';
import { usePortal } from '@/context/PortalContext';
import { font, fontSize, getPortalAccent, radius, spacing, useTheme } from '@/theme';

/** Portal-tinted informational banner (mirrors `.info-badge`). */
export function InfoBadge({ text }: { text: string }) {
  const { portal } = usePortal();
  const { colors } = useTheme();
  const accent = getPortalAccent(portal ?? 'provider', colors);
  return (
    <View style={[styles.badge, { backgroundColor: accent.light }]}>
      <Text style={[styles.text, { color: colors.brown }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: spacing.md,
  },
  text: { ...font.regular, fontSize: fontSize.body, lineHeight: 20, flex: 1 },
});
