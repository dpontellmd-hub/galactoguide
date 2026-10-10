import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useForum } from '@/context/ForumContext';
import { font, fontSize, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';

export default function CommunityRulesScreen() {
  const { user } = useAuth();
  const { safety, setBlocked, refresh } = useForum();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unblock = async (id: string) => {
    if (busy) return;
    setBusy(id); setError(null);
    try { const result = await setBlocked(id, false); if (result.error) setError(result.error); }
    finally { setBusy(null); }
  };
  return <View style={styles.root}>
    <ScreenHeader title="Community rules & safety" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Support each other. Protect your privacy.</Text>
      <Text style={styles.text}>GalactoGuide discussions are for adults sharing lactation experiences. Posts are public. They are not a private patient portal, a medical consultation, or an emergency service.</Text>
      {[
        'Treat people respectfully. No harassment, hate, threats, sexual exploitation, or encouragement of violence or self-harm.',
        'Do not share anyone’s private contact information, medical records, identifying photos, or other personal information. Keep your own health details general.',
        'Share personal experiences honestly. Do not impersonate clinicians, prescribe treatment to others, or present unsafe medical claims as established facts. Contact a qualified healthcare professional about your care.',
        'No spam, scams, commercial solicitation, illegal material, or repeated disruptive posts.',
        'Use Report on any thread or reply that breaks these rules. Reports go to authorized community moderators. Do not copy abusive or private content into your report.',
        'Use Block member to hide their posts while signed in and prevent replies between your accounts. Public discussions can still be read when signed out. You can unblock below.',
        'Automated checks reject some abusive text, private contact details, and rapid repeated posts. These checks cannot catch every problem. Moderators can remove posts and suspend posting access.',
      ].map((rule) => <Text key={rule} style={styles.text}>• {rule}</Text>)}
      <View style={styles.card}>
        <Text style={styles.heading}>Contact & appeals</Text>
        <Text style={styles.text}>For a report you cannot send in the app, a posting restriction, or an appeal, contact adam@dyadhealthcollective.com. Include the thread link and a short explanation; do not email sensitive medical records. This inbox is not an emergency service and continuous monitoring is not promised.</Text>
        <Pressable accessibilityRole="link" style={styles.button} onPress={() => { void Linking.openURL('mailto:adam@dyadhealthcollective.com?subject=GalactoGuide%20community%20support').catch(() => setError('Please email adam@dyadhealthcollective.com using your email app.')); }}><Text style={styles.action}>Email community support</Text></Pressable>
      </View>
      {user && <View style={styles.card}>
        <Text style={styles.heading}>Blocked members</Text>
        {!safety ? <><Text style={styles.text}>Your safety settings could not be loaded.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => void refresh()}><Text style={styles.action}>Retry</Text></Pressable></> : <>
          {safety.is_suspended && <Text style={styles.text}>Your posting access is suspended. Contact community support to request review.</Text>}
          {safety.blocked_users.length === 0 && <Text style={styles.text}>You have no blocked members.</Text>}
          {safety.blocked_users.map((member, index) => <View key={member.user_id} style={styles.row}>
            <Text style={styles.text}>{member.author_name || 'Blocked member'} {index + 1}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Unblock member ${index + 1}`} style={styles.button} disabled={!!busy} onPress={() => void unblock(member.user_id)}><Text style={styles.action}>{busy === member.user_id ? 'Saving…' : 'Unblock'}</Text></Pressable>
          </View>)}
          {safety.is_moderator && <Pressable accessibilityRole="link" style={styles.button} onPress={() => router.push('/moderation')}><Text style={styles.action}>Open moderator review queue</Text></Pressable>}
        </>}
      </View>}
      {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
    </ScrollView>
  </View>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appBg }, content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.lg },
  heading: { ...font.bold, color: colors.text, fontSize: fontSize.cardTitle },
  text: { ...font.regular, color: colors.text, fontSize: fontSize.body, lineHeight: 23, flexShrink: 1 },
  card: { backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  action: { ...font.bold, color: colors.accent, fontSize: fontSize.body },
});
