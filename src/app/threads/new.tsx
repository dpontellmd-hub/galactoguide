import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForumAuthPrompt } from '@/components/forum-auth-prompt';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormScrollView } from '@/components/form-scroll-view';
import { useAuth } from '@/context/AuthContext';
import { useForum } from '@/context/ForumContext';
import { usePortal } from '@/context/PortalContext';
import { FORUM_TOPICS, type ForumTopic } from '@/data/forum';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function NewThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { portal, disclaimerAccepted } = usePortal();
  const { colors } = useTheme();
  const { createThread } = useForum();
  const styles = useThemedStyles(makeStyles);
  const [topic, setTopic] = useState<ForumTopic>(FORUM_TOPICS[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createThread({ title, body, topic });
      if (result.error || !result.data) {
        setError(result.error ?? 'The thread could not be created.');
        return;
      }
      router.replace({ pathname: '/threads/[id]', params: { id: result.data.id } });
    } finally {
      setBusy(false);
    }
  };

  if (!portal || !disclaimerAccepted) return <Redirect href="/" />;

  return (
    <View
      style={styles.root}
    >
      <ScreenHeader title="Start a thread" />
      <FormScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {!user ? (
          <ForumAuthPrompt action="start a thread" />
        ) : (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Share what&apos;s on your mind</Text>
              <Text style={styles.introText}>
                Ask a question or begin a supportive discussion. Avoid personal medical details
                you would not want to share publicly.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>TOPIC</Text>
              <View style={styles.topicRow}>
                {FORUM_TOPICS.map((option) => {
                  const selected = option === topic;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setTopic(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option} topic`}
                      style={({ pressed }) => [
                        styles.topicButton,
                        selected && styles.topicButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.topicButtonText, selected && styles.topicButtonTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>TITLE</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What would you like to talk about?"
                placeholderTextColor={colors.textFaint}
                maxLength={120}
                editable={!busy}
                accessibilityLabel="Thread title"
                style={styles.titleInput}
              />
              <Text style={styles.counter}>{title.length}/120</Text>

              <Text style={styles.label}>POST</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Add context, a question, or an experience…"
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={4000}
                editable={!busy}
                accessibilityLabel="Thread post"
                style={styles.bodyInput}
              />
              <Text style={styles.counter}>{body.length}/4000</Text>

              {error && (
                <Text style={styles.error} accessibilityRole="alert" selectable>
                  {error}
                </Text>
              )}

              <Pressable
                onPress={submit}
                disabled={busy || title.trim().length < 5 || body.trim().length < 10}
                accessibilityRole="button"
                accessibilityLabel="Publish thread"
                accessibilityState={{
                  disabled: busy || title.trim().length < 5 || body.trim().length < 10,
                }}
                style={({ pressed }) => [
                  styles.publishButton,
                  (busy || title.trim().length < 5 || body.trim().length < 10) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Text style={styles.publishButtonText}>Publish thread</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 22, paddingTop: spacing.sm, gap: spacing.xl },
    introCard: {
      backgroundColor: colors.terraLight,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.xs,
    },
    introTitle: { ...font.extrabold, fontSize: fontSize.lg, color: colors.text },
    introText: { ...font.semibold, fontSize: fontSize.body, lineHeight: 20, color: colors.textSecondary },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    label: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1,
      color: colors.textMuted,
      paddingTop: spacing.sm,
    },
    topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    topicButton: {
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      borderRadius: radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    topicButtonSelected: { backgroundColor: colors.ink.bg, borderColor: colors.ink.bg },
    topicButtonText: { ...font.bold, fontSize: fontSize.small, color: colors.textSecondary },
    topicButtonTextSelected: { color: colors.ink.fg },
    titleInput: {
      minHeight: 48,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.lg,
      backgroundColor: colors.inputBg,
      paddingHorizontal: spacing.lg,
      paddingVertical: 11,
      ...font.semibold,
      fontSize: fontSize.base,
      color: colors.text,
    },
    bodyInput: {
      minHeight: 150,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.lg,
      backgroundColor: colors.inputBg,
      padding: spacing.lg,
      textAlignVertical: 'top',
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.text,
    },
    counter: {
      ...font.semibold,
      alignSelf: 'flex-end',
      fontSize: fontSize.tiny,
      color: colors.textFaint,
      fontVariant: ['tabular-nums'],
    },
    error: { ...font.semibold, fontSize: fontSize.small, lineHeight: 18, color: colors.noteCaution.strong },
    publishButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.sm,
    },
    publishButtonText: { ...font.extrabold, fontSize: fontSize.base, color: colors.onAccent },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.72 },
  });
