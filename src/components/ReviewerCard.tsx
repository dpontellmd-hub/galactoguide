import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  name: string;
  /** Human-readable date, e.g. "May 12, 2026". */
  updated: string;
  sourceCount: number;
  onPressSources: () => void;
}

/** Entry-page reviewer credit: avatar + verified badge + reviewed/updated line. */
export function ReviewerCard({ name, updated, sourceCount, onPressSources }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar} />
        <View style={styles.badge}>
          <Svg width={8} height={7} viewBox="0 0 8 7">
            <Path
              d="M1 3.5 L3 5.5 L7 1"
              stroke={colors.surface}
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
      <Text style={styles.text}>
        Reviewed by <Text style={styles.name}>{name}</Text>
        {'\n'}Updated {updated}
        {sourceCount > 0 && (
          <>
            {' · '}
            <Text
              style={styles.sources}
              onPress={onPressSources}
              accessibilityRole="button"
              accessibilityLabel={`View ${sourceCount} sources`}
              suppressHighlighting
            >
              {sourceCount} sources ↗
            </Text>
          </>
        )}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    avatarWrap: { flexShrink: 0 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.countChipBg },
    badge: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.verified,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      ...font.bold,
      fontSize: fontSize.link,
      lineHeight: 18,
      color: colors.textSecondary,
      flex: 1,
    },
    name: { ...font.extrabold, color: colors.text },
    sources: { textDecorationLine: 'underline' },
  });
