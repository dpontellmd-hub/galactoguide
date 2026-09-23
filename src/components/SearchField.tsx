import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  placeholder: string;
  /** Live-input mode. */
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
  /** Pressable-façade mode (Home) — routes instead of editing. */
  onPress?: () => void;
  /** Reduced-height treatment for a secondary search action. */
  compact?: boolean;
}

function Magnifier({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Circle cx={7.5} cy={7.5} r={5.5} fill="none" stroke={color} strokeWidth={2} />
      <Line x1={12} y1={12} x2={16} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** The design's search field: white pill, magnifier, soft shadow. */
export function SearchField({ placeholder, value, onChangeText, autoFocus, onPress, compact }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const focusStyle = focused
    ? { borderColor: colors.accent, boxShadow: colors.focusRing }
    : undefined;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.field, compact && styles.compactField, focusStyle]}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      >
        <Magnifier color={colors.textFaint} />
        <Text style={[styles.placeholder, compact && styles.compactText]} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.field, compact && styles.compactField, focusStyle]}>
      <Magnifier color={colors.textFaint} />
      <TextInput
        style={[styles.input, compact && styles.compactText]}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 24,
      paddingVertical: 15,
      paddingHorizontal: 18,
      boxShadow: colors.shadowSoft,
    },
    compactField: { paddingVertical: 11 },
    compactText: { fontSize: fontSize.note },
    placeholder: {
      ...font.semibold,
      fontSize: fontSize.rowName,
      color: colors.textFaint,
      flex: 1,
    },
    input: {
      ...font.semibold,
      fontSize: fontSize.rowName,
      color: colors.text,
      flex: 1,
      padding: 0,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
    },
  });
