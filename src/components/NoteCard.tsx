import { StyleSheet, Text, View } from 'react-native';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  tone: 'neutral' | 'caution';
  text: string;
  /** Emphasized tail in the caution accent ("Ask your clinician first."). */
  strongTail?: string;
}

/** "Good to know" note: tinted card with one plain-language sentence. */
export function NoteCard({ tone, text, strongTail }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const note = tone === 'caution' ? colors.noteCaution : colors.noteNeutral;
  return (
    <View style={[styles.card, { backgroundColor: note.bg }]}>
      <Text style={styles.text}>
        {text}
        {strongTail ? (
          <Text style={[styles.strong, { color: colors.noteCaution.strong }]}> {strongTail}</Text>
        ) : null}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    text: { ...font.bold, fontSize: fontSize.note, lineHeight: 21, color: colors.text, flex: 1 },
    strong: { ...font.extrabold },
  });
