import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormScrollView } from '@/components/form-scroll-view';
import { usePortal } from '@/context/PortalContext';
import {
  font,
  fontSize,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xlgokjgl';

const BADGE = {
  mother: 'Your feedback helps improve GalactoGuide for families everywhere. Thank you!',
  provider:
    'Your clinical feedback is invaluable. Help us improve accuracy and coverage.',
};

const REACTIONS = {
  mother: ['Yes, very helpful', 'Somewhat helpful', 'Not helpful', 'Missing info I needed'],
  provider: ['Clinically accurate', 'Needs more detail', 'Missing substances', 'Needs references'],
};

export default function FeedbackScreen() {
  const { isMother } = usePortal();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accentMain = colors.accent;
  const accentLight = colors.terraLight;
  const accentOn = colors.brown;

  const [stars, setStars] = useState(0);
  const [reaction, setReaction] = useState('');
  const [comments, setComments] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const reactions = isMother ? REACTIONS.mother : REACTIONS.provider;
  const q1 = isMother ? 'Was this information helpful?' : 'How would you rate the clinical accuracy?';
  const q2 = isMother
    ? 'What would you like to see added or improved?'
    : 'What substances or features should we add?';

  const submit = async () => {
    setStatus('submitting');
    const body = {
      portal: isMother ? 'Lactating Parent or Caregiver' : 'Healthcare Provider',
      star_rating: stars ? `${stars} / 5` : 'Not rated',
      reaction: reaction || 'Not selected',
      comments: comments || 'None',
      name: name || 'Anonymous',
      email: email || 'Not provided',
      submitted_at: new Date().toLocaleString(),
    };
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <View style={styles.wrap}>
        <ScreenHeader title="Send feedback" />
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.doneContent}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.thanksMark}>
            <Text style={styles.thanksMarkText}>✓</Text>
          </View>
          <Text style={styles.thanksTitle} accessibilityRole="header">
            Feedback received
          </Text>
          <Text style={styles.thanksText}>
            Thank you for helping us make GalactoGuide more useful for families and healthcare
            providers.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Send feedback" />
      <FormScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.introEyebrow}>HELP US IMPROVE</Text>
          <Text style={styles.introTitle} accessibilityRole="header">
            Tell us what would make this guide more useful
          </Text>
          <Text style={styles.introText}>{isMother ? BADGE.mother : BADGE.provider}</Text>
        </View>

        <View style={styles.privacyNotice}>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Before you submit</Text>
            <Text style={styles.privacyText}>
              {isMother
                ? 'Feedback is sent through Formspree. Please do not include medical information or other sensitive details. Name and email are optional.'
                : 'Feedback is sent through Formspree. Do not include patient information, protected health information, or other sensitive details. Name and email are optional.'}
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>1 OF 4 · OVERALL EXPERIENCE</Text>
          <Text style={styles.question}>How useful is GalactoGuide to you?</Text>
          <Text style={styles.helper}>{stars ? `${stars} out of 5 stars` : 'Tap a star to rate'}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((i) => {
              const selected = i <= stars;
              return (
                <Pressable
                  key={i}
                  onPress={() => setStars(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
                  accessibilityState={{ selected: i === stars }}
                  style={[styles.starButton, selected && styles.starButtonSelected]}
                >
                  <Text style={[styles.star, selected && styles.starSelected]}>★</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>2 OF 4 · QUICK RESPONSE</Text>
          <Text style={styles.question}>{q1}</Text>
          <View style={styles.reactionRow}>
            {reactions.map((r) => {
              const sel = reaction === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReaction(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  style={[
                    styles.reactionBtn,
                    sel && { backgroundColor: accentLight, borderColor: accentMain },
                  ]}
                >
                  <View style={[styles.radio, sel && { borderColor: accentMain }]}>
                    {sel && <View style={[styles.radioDot, { backgroundColor: accentMain }]} />}
                  </View>
                  <Text style={[styles.reactionText, sel && { color: accentOn }]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>3 OF 4 · YOUR IDEAS</Text>
          <Text style={styles.question}>{q2}</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Share your thoughts…"
            placeholderTextColor={colors.textFaint}
            value={comments}
            onChangeText={setComments}
            multiline
            accessibilityLabel={q2}
          />
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>4 OF 4 · OPTIONAL CONTACT</Text>
          <Text style={styles.question}>Would you like us to follow up?</Text>
          <Text style={styles.helper}>Leave either field blank to stay anonymous.</Text>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            accessibilityLabel="Name"
          />
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
          />
        </View>

        {status === 'error' && (
          <Text style={styles.errorText} accessibilityRole="alert">
            Could not submit. Check your connection and try again.
          </Text>
        )}

        <Pressable
          onPress={submit}
          disabled={status === 'submitting'}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: accentMain },
            (pressed || status === 'submitting') && styles.submitPressed,
          ]}
        >
          <Text style={styles.submitText}>
            {status === 'submitting' ? 'Sending feedback…' : 'Send feedback'}
          </Text>
        </Pressable>
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.appBg },
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40, gap: spacing.md },
    intro: {
      backgroundColor: colors.cream,
      borderRadius: 22,
      padding: 20,
      marginBottom: spacing.xs,
    },
    introEyebrow: {
      ...font.bold,
      fontSize: fontSize.micro,
      letterSpacing: 1.05,
      color: colors.brown,
      marginBottom: spacing.sm,
    },
    introTitle: {
      ...font.extrabold,
      fontSize: fontSize.hero,
      lineHeight: 30,
      letterSpacing: -0.25,
      color: colors.text,
    },
    introText: {
      ...font.regular,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    privacyNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.noteNeutral.bg,
      borderRadius: radius.lg,
      padding: 16,
    },
    privacyCopy: { flex: 1 },
    privacyTitle: { ...font.bold, fontSize: fontSize.base, color: colors.text, marginBottom: 4 },
    privacyText: { ...font.regular, fontSize: fontSize.base, lineHeight: 21, color: colors.textSecondary },
    stepCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
    },
    stepLabel: {
      ...font.bold,
      fontSize: fontSize.micro,
      letterSpacing: 0.85,
      color: colors.accent,
      marginBottom: spacing.sm,
    },
    question: { ...font.extrabold, fontSize: fontSize.xl, lineHeight: 25, color: colors.text },
    helper: { ...font.regular, fontSize: fontSize.base, color: colors.textMuted, lineHeight: 20, marginTop: 4 },
    starRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 16 },
    starButton: {
      width: 48,
      height: 48,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    starButtonSelected: { backgroundColor: colors.cream, borderColor: colors.caramel },
    star: { ...font.regular, fontSize: 26, color: colors.textFaint },
    starSelected: { color: colors.star },
    reactionRow: { gap: 8, marginTop: 16 },
    reactionBtn: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    reactionText: { ...font.semibold, fontSize: fontSize.base, lineHeight: 20, color: colors.textSecondary, flex: 1 },
    textarea: {
      ...font.regular,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.lg,
      backgroundColor: colors.inputBg,
      color: colors.text,
      padding: 14,
      fontSize: 16,
      lineHeight: 23,
      minHeight: 140,
      textAlignVertical: 'top',
      marginTop: 16,
    },
    inputLabel: {
      ...font.bold,
      fontSize: fontSize.small,
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 6,
    },
    input: {
      ...font.regular,
      minHeight: 50,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.lg,
      backgroundColor: colors.inputBg,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 16,
    },
    errorText: {
      ...font.semibold,
      fontSize: fontSize.base,
      lineHeight: 21,
      color: colors.safetyAvoid.fg,
      backgroundColor: colors.safetyAvoid.bg,
      borderRadius: radius.lg,
      padding: 14,
    },
    submitBtn: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    submitPressed: { opacity: 0.68 },
    submitText: { ...font.extrabold, fontSize: fontSize.lg, color: colors.onAccent },
    doneContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 80,
    },
    thanksMark: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.resultRec.bg,
      marginBottom: 18,
    },
    thanksMarkText: { ...font.extrabold, fontSize: 32, color: colors.resultRec.title },
    thanksTitle: { ...font.extrabold, fontSize: fontSize.hero, color: colors.text, textAlign: 'center' },
    thanksText: {
      ...font.regular,
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      textAlign: 'center',
      marginTop: 8,
    },
});
