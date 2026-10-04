import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  title: string;
  linkLabel: string;
  bg: string;
  linkColor: string;
  onPress: () => void;
  spacious?: boolean;
}

/** Home's tinted action card ("New prescription? / Check it →"). */
export function ActionCard({ title, linkLabel, bg, linkColor, onPress, spacious = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const displayLinkLabel = linkLabel.replace(/ (?=→$)/u, '\u00a0');
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${linkLabel}`}
      style={({ pressed }) => [
        styles.card, { backgroundColor: bg }, spacious && styles.spacious,
        hovered && { boxShadow: colors.shadowCard },
        focused && { boxShadow: colors.focusRing },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.title, spacious && styles.spaciousTitle]}>{title}</Text>
      <Text style={[styles.link, { color: linkColor }]}>{displayLinkLabel}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 94,
      justifyContent: 'space-between',
      borderRadius: 22,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    title: {
      ...font.extrabold,
      fontSize: fontSize.actionTitle,
      lineHeight: 19.5,
      color: colors.text,
    },
    spacious: { minHeight: 154, paddingHorizontal: 24, paddingVertical: 22 },
    spaciousTitle: { fontSize: 21, lineHeight: 27 },
    link: { ...font.extrabold, fontSize: fontSize.link, marginTop: 7 },
  });
