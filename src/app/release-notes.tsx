import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReleaseNoteCard } from '@/components/release-note-card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { releaseNotes } from '@/data/release-notes';
import { font, layout, spacing, useThemedStyles, type ThemeColors } from '@/theme';

export default function ReleaseNotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Release notes"
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/about')}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.intro}>What’s new in GalactoGuide, with the latest updates first.</Text>
        {releaseNotes.map((release, index) => (
          <ReleaseNoteCard key={release.version} release={release} latest={index === 0} />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appBg },
  content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.sm },
  intro: { ...font.regular, fontSize: 15, lineHeight: 24, color: colors.textSecondary, marginBottom: spacing.lg },
});
