import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EvidenceMeter } from '@/components/EvidenceMeter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { font, fontSize, useThemedStyles, type ThemeColors } from '@/theme';

const LEVELS: { score: number; name: string; desc: string }[] = [
  {
    score: 4,
    name: 'Strong',
    desc: 'Multiple well-designed studies point the same way. As solid as lactation research gets.',
  },
  {
    score: 3,
    name: 'Moderate',
    desc: 'Good studies exist, but they are few, small, or leave open questions.',
  },
  {
    score: 2,
    name: 'Limited',
    desc: 'A handful of small or mixed studies. Signals, not proof.',
  },
  {
    score: 1,
    name: 'Anecdotal',
    desc: 'Tradition and reports from parents and clinicians — no formal trials yet.',
  },
];

/** The evidence-grading methodology explainer ("how we grade"). */
export default function GradingScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.root}>
      <ScreenHeader title="How we grade evidence" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Every entry carries a meter showing how good the research is — not how strong the
          effect is, and never whether something is safe. The dots stay neutral on purpose:
          they grade the science, nothing else.
        </Text>
        {LEVELS.map((l) => (
          <View key={l.score} style={styles.card}>
            <View style={styles.cardHeader}>
              <EvidenceMeter score={l.score} align="left" />
              <Text style={styles.levelName}>{l.name} evidence</Text>
            </View>
            <Text style={styles.levelDesc}>{l.desc}</Text>
          </View>
        ))}
        <Text style={styles.footer}>
          Gradings follow the published lactation literature (LactMed, ABM protocols, and
          peer-reviewed trials) and are reviewed by our clinical team.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: 22, paddingBottom: 32, paddingTop: 4 },
    intro: {
      ...font.semibold,
      fontSize: fontSize.note,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 16,
      marginTop: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    levelName: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    levelDesc: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 8,
    },
    footer: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textFaint,
      marginTop: 16,
    },
  });
