import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionCard } from '@/components/ActionCard';
import { AccountButton } from '@/components/AccountButton';
import { Chevron } from '@/components/Chevron';
import { CountChip } from '@/components/CountChip';
import { openExternal } from '@/components/ExternalLink';
import { LaunchLogo } from '@/components/LaunchLogo';
import { SavedList } from '@/components/SavedList';
import { SearchField } from '@/components/SearchField';
import { SectionLabel } from '@/components/SectionLabel';
import { CollapsingScrollView } from '@/components/collapsing-scroll-view';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { font, fontSize, layout, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

/** Home — the single discovery destination, plus the user's saved items. */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { favorites } = useFavorites();
  const { user } = useAuth();
  const { isDesktop, hasSupportingColumn, hasSideNavigation } = useResponsiveLayout();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const editing = !!user && editingUserId === user.id;
  const search = (
    <View style={isDesktop ? styles.desktopSearch : undefined}>
      {isDesktop && <SectionLabel>Find a specific entry</SectionLabel>}
      <View style={styles.search}>
        <SearchField
          compact={!isDesktop}
          placeholder="Search by name or brand"
          onPress={() => router.push({ pathname: '/a-z', params: { focus: '1' } })}
        />
      </View>
    </View>
  );
  const disclaimer = (
    <Text style={[styles.disclaimer, isDesktop && styles.desktopDisclaimer]}>
      The For you tab organizes context-specific considerations. It does not assess your complete
      medical history, determine effectiveness, or replace advice from your clinician or IBCLC.
    </Text>
  );

  return (
    <CollapsingScrollView
      headerTitle="Support your milk production goals"
      testID="home-scroll"
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + layout.screenHeaderTopSpacing },
        isDesktop && styles.desktopContent,
      ]}
    >
      {!hasSideNavigation && <View style={styles.brand}>
        <LaunchLogo />
        <Text style={styles.brandName}>GalactoGuide</Text>
        <AccountButton onPress={() => router.push('/account')} />
      </View>}
      <TabScreenHeader
        title="Support your milk production goals"
        showAccount={false}
        style={isDesktop && styles.desktopHeader}
      >
        {isDesktop && <Text style={styles.desktopIntro}>Explore the evidence, or return to an entry you’ve saved.</Text>}
      </TabScreenHeader>

      <View testID="home-columns" style={hasSupportingColumn && styles.columns}>
        <View testID="home-discovery" style={styles.discovery}>
          {isDesktop && search}
          {isDesktop && <SectionLabel style={styles.discoveryLabel}>Explore by topic</SectionLabel>}
          {/* Fixed pairs keep native resize passes from reflowing into a 3 + 1 grid. */}
          <View testID="home-action-grid" style={styles.grid}>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <ActionCard
                  spacious={isDesktop}
                  title="New prescription?"
                  linkLabel="Check the evidence →"
                  bg={colors.discovery.blue}
                  linkColor={colors.discovery.blueFg}
                  onPress={() => router.push({ pathname: '/a-z', params: { category: 'pharma' } })}
                />
              </View>
              <View style={styles.gridItem}>
                <ActionCard
                  spacious={isDesktop}
                  title="Increasing milk production?"
                  linkLabel="What's been studied →"
                  bg={colors.discovery.green}
                  linkColor={colors.kindGogue.fg}
                  onPress={() => router.push({ pathname: '/a-z', params: { kind: 'gogue' } })}
                />
              </View>
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <ActionCard
                  spacious={isDesktop}
                  title="What can lower my milk production?"
                  linkLabel="Possible reducers →"
                  bg={colors.discovery.blush}
                  linkColor={colors.kindFuge.fg}
                  onPress={() => router.push({ pathname: '/a-z', params: { kind: 'fuge' } })}
                />
              </View>
              <View style={styles.gridItem}>
                <ActionCard
                  spacious={isDesktop}
                  title="Herbs & supplements"
                  linkLabel="View options →"
                  bg={colors.discovery.herbal}
                  linkColor={colors.discovery.herbalFg}
                  onPress={() => router.push({ pathname: '/a-z', params: { category: 'herbal' } })}
                />
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/a-z')}
            accessibilityRole="button"
            accessibilityLabel="Everything, A to Z — full alphabetical index"
            style={({ pressed }) => [styles.azButton, pressed && styles.azButtonPressed]}
          >
            <LinearGradient
              colors={colors.discovery.gradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.azGradient, isDesktop && styles.desktopAzGradient]}
            >
              <Text style={[styles.azText, isDesktop && styles.desktopAzText]}>Everything, A–Z</Text>
              <Chevron color={colors.text} />
            </LinearGradient>
          </Pressable>

          {!isDesktop && search}
        </View>

        <View testID="home-support" style={[styles.support, hasSupportingColumn && styles.supportColumn]}>
          <View style={[styles.savedHeader, hasSupportingColumn && styles.desktopSavedHeader]}>
            <View style={styles.savedTitle}>
              <Text style={styles.savedLabelText}>Saved</Text>
              {user && <CountChip value={favorites.size} />}
            </View>
            {user && favorites.size > 0 && (
              <Pressable
                onPress={() => setEditingUserId(editing ? null : user.id)}
                accessibilityRole="button"
                accessibilityLabel={editing ? 'Done editing saved list' : 'Edit saved list'}
                hitSlop={8}
              >
                <Text style={styles.editLink}>{editing ? 'done' : 'edit'}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.savedList}>
            <SavedList editing={!!user && editing} />
          </View>

          {isDesktop && <SectionLabel style={styles.resourcesLabel}>Resources & support</SectionLabel>}

          <Link href="/resources" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Trusted resources — references and support directories"
              style={styles.resourcesLink}
            >
              <View style={styles.resourcesLinkCopy}>
                <Text style={styles.resourcesLinkTitle}>Trusted resources</Text>
                <Text style={styles.resourcesLinkSubtitle}>
                  References and support directories
                </Text>
              </View>
              <Chevron />
            </Pressable>
          </Link>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Trusted Essentials — open Amazon shopping list"
            accessibilityHint="100% of affiliate proceeds go to our Patient Assistance Fund, helping families access high-quality lactation care."
            onPress={() => openExternal('https://a.co/d/09xjAgLr')}
            style={[styles.resourcesLink, styles.essentialsLink]}
          >
            <View style={styles.resourcesLinkCopy}>
              <Text style={styles.resourcesLinkTitle}>Trusted Essentials</Text>
              <Text style={styles.resourcesLinkSubtitle}>
                Shop our Amazon list
              </Text>
              <Text style={styles.essentialsNote}>
                100% of affiliate proceeds go to our Patient Assistance Fund, helping families
                access high-quality lactation care.
              </Text>
            </View>
            <Chevron />
          </Pressable>
          <Link href="/feedback" asChild>
            <Pressable
              accessibilityRole="link"
              style={styles.feedbackLink}
            >
              <Text style={styles.feedbackLinkText}>Send us feedback</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      {disclaimer}
    </CollapsingScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    brandName: { ...font.extrabold, fontSize: fontSize.xl, color: colors.text, flex: 1 },
    content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: 32 },
    desktopContent: { paddingHorizontal: layout.desktopPagePadding, paddingTop: 48, paddingBottom: 36 },
    desktopHeader: { marginBottom: 36, maxWidth: 760 },
    desktopIntro: { ...font.regular, fontSize: fontSize.lg, lineHeight: 26, color: colors.textSecondary },
    columns: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.desktopColumnGap },
    discovery: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
    support: { minWidth: 0 },
    supportColumn: { width: layout.supportingColumnWidth, flexShrink: 0 },
    desktopSearch: { marginBottom: 28 },
    discoveryLabel: { marginBottom: 12 },
    desktopSavedHeader: { marginTop: 0 },
    resourcesLabel: { marginTop: 30 },
    desktopDisclaimer: {
      marginTop: 36,
      textAlign: 'left', paddingHorizontal: 0, maxWidth: 760,
    },
    grid: { gap: 10 },
    gridRow: { flexDirection: 'row', gap: 10 },
    gridItem: { flex: 1, minWidth: 0 },
    search: { marginTop: 10 },
    azButton: {
      borderRadius: 20,
      overflow: 'hidden',
      marginTop: 10,
    },
    azButtonPressed: { opacity: 0.78 },
    azGradient: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    desktopAzGradient: { minHeight: 84, paddingVertical: 22, paddingHorizontal: 24 },
    azText: { ...font.extrabold, fontSize: fontSize.note, color: colors.text },
    desktopAzText: { fontSize: 21, lineHeight: 27 },
    savedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    savedTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    savedLabelText: {
      ...font.extrabold,
      fontSize: fontSize.small,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.textMuted,
    },
    editLink: { ...font.bold, fontSize: fontSize.link, color: colors.textFaint },
    savedList: { marginTop: 10 },
    disclaimer: {
      ...font.regular,
      fontSize: fontSize.small,
      color: colors.textFaint,
      textAlign: 'center',
      marginTop: 24,
      paddingHorizontal: 8,
      lineHeight: 18,
    },
    resourcesLink: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 18,
      marginTop: 16,
    },
    essentialsLink: { borderColor: `${colors.discovery.blueFg}66` },
    resourcesLinkCopy: { flex: 1 },
    feedbackLink: {
      alignSelf: 'center',
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 8,
      borderRadius: 12,
    },
    feedbackLinkText: {
      ...font.semibold,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    essentialsNote: {
      ...font.regular,
      fontSize: fontSize.small,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 8,
    },
    resourcesLinkTitle: { ...font.extrabold, fontSize: fontSize.lg, color: colors.text },
    resourcesLinkSubtitle: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
