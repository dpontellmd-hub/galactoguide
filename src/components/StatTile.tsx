import { StyleSheet, Text, View } from 'react-native';
import { font, fontSize, useThemedStyles, type ThemeColors } from '@/theme';

interface Props {
  label: string;
  value: string;
  detail?: string;
}

/** Entry-page stat tile ("TYPICAL USE / 1.7–4.9 g/day / capsules or tea"). */
export function StatTile({ label, value, detail }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
        {detail ? <Text style={styles.detail}>{'\n'}{detail}</Text> : null}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
    },
    label: {
      ...font.extrabold,
      fontSize: fontSize.statLabel,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    value: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      lineHeight: 21,
      color: colors.text,
      marginTop: 6,
    },
    detail: { ...font.bold, fontSize: fontSize.body, color: colors.explainerText },
  });
