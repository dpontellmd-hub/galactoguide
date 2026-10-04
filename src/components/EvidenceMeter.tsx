import { StyleSheet, Text, View } from 'react-native';
import { evidenceCaption } from '@/lib/format';
import { font, fontSize, useTheme } from '@/theme';

interface Props {
  /** Evidence score 1–4, with 4 filling every dot. */
  score: number;
  /** 9px dots on list rows, 18px on the entry evidence card. */
  size?: 9 | 18;
  /** Caption to the right of the dots ("Moderate evidence"). */
  showCaption?: boolean;
  /** Adds the neutral "mixed results" qualifier to the caption and accessibility label. */
  mixedResults?: boolean;
  /** Right-aligns dots + caption (list rows). */
  align?: 'left' | 'right';
}

/**
 * The evidence meter: four dots filled to `score`, always in neutral ink —
 * never green/red, never the accent. It communicates evidence *quality*,
 * not effect strength or direction.
 */
export function EvidenceMeter({
  score,
  size = 9,
  showCaption = false,
  mixedResults = false,
  align = 'right',
}: Props) {
  const { colors } = useTheme();
  const justifyContent = align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <View
      style={[styles.wrap, { justifyContent }]}
      accessibilityRole="image"
      accessibilityLabel={`${evidenceCaption(score, mixedResults)}, ${score} of 4`}
    >
      <View style={[styles.row, { gap: size === 18 ? 5 : 2.5 }]}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: i <= score ? colors.evidenceFilled : colors.evidenceEmpty,
            }}
          />
        ))}
      </View>
      {showCaption && (
        <Text style={[styles.caption, { color: colors.textFaint }]}>
          {evidenceCaption(score, mixedResults)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  caption: {
    ...font.extrabold,
    fontSize: fontSize.meterCaption,
    flexShrink: 1,
  },
});
