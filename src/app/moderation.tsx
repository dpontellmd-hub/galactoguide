import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useForum } from '@/context/ForumContext';
import { supabase } from '@/lib/supabase';
import { font, fontSize, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';
interface Report {
  id: string; thread_id: string; target_kind: string; target_id: string; category: string; reason: string;
  status: string; created_at: string; author_id: string | null; author_name: string | null;
  title: string | null; body: string | null; resolution: string | null;
}
type Action = 'dismiss' | 'remove' | 'suspend';
export default function ModerationScreen() {
  const { user } = useAuth();
  return <ModeratorQueue key={user?.id ?? 'anonymous'} />;
}
function ModeratorQueue() {
  const { user } = useAuth();
  const router = useRouter();
  const { safety, refresh } = useForum();
  const styles = useThemedStyles(makeStyles);
  const [reports, setReports] = useState<Report[]>([]);
  const [suspensions, setSuspensions] = useState<{ user_id: string; created_at: string }[]>([]);
  const [filter, setFilter] = useState('open');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: Action | 'restore' } | null>(null);
  const request = useRef(0);
  const allowed = !!user && !!safety?.is_moderator;
  const load = useCallback(async () => {
    const revision = ++request.current;
    if (!allowed) return;
    setLoaded(false); setError(null);
    try {
      const [queue, restrictions] = await Promise.all([
        supabase.rpc('moderation_queue', { p_status: filter }), supabase.rpc('list_forum_suspensions'),
      ]);
      if (revision !== request.current) return;
      if (queue.error || restrictions.error) { setReports([]); setSuspensions([]); setError('Could not load moderation data. Access may have changed.'); return; }
      setReports((queue.data ?? []) as Report[]); setSuspensions(restrictions.data ?? []); setLoaded(true);
    } catch { if (revision === request.current) { setReports([]); setSuspensions([]); setError('Could not load moderation data. Please retry.'); } }
  }, [allowed, filter]);
  useEffect(() => { const requestRef = request; const timer = setTimeout(() => { void load(); }, 0); return () => { clearTimeout(timer); requestRef.current++; }; }, [load]);
  const act = async () => {
    if (!confirm || pending.current || !allowed) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = confirm.action === 'restore'
        ? await supabase.rpc('set_forum_suspension', { p_user_id: confirm.id, p_suspended: false })
        : await supabase.rpc('moderate_forum_report', { p_report_id: confirm.id, p_action: confirm.action, p_note: '' });
      if (result.error || result.data !== true) { setError('Action was not confirmed. Refresh the queue before trying again.'); return; }
      setConfirm(null); await Promise.all([load(), refresh()]);
    } catch { setError('Could not confirm the action. Refresh before trying again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <View style={styles.root}>
    <ScreenHeader title="Moderator review" />
    <ScrollView contentContainerStyle={styles.content}>
      {!allowed ? <Text style={styles.text}>Moderator access is required. Only roles assigned by the administrator can open this queue.</Text> : <>
        <Text style={styles.text}>Reports contain member-submitted details. Handle them privately. Read the post and surrounding discussion before acting; a report alone does not establish misconduct.</Text>
        <View style={styles.row}>{['open', 'resolved', 'all'].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: filter === value }} disabled={busy} style={styles.button} onPress={() => { setConfirm(null); setFilter(value); }}><Text style={styles.action}>{value === filter ? '✓ ' : ''}{value}</Text></Pressable>)}{<QueueButton label="Refresh" disabled={busy} onPress={() => void load()} />}</View>
        {!loaded && !error && <Text style={styles.text}>Loading reports…</Text>}
        {loaded && reports.length === 0 && <Text style={styles.text}>No reports in this view.</Text>}
        {reports.map((report) => <View key={report.id} style={styles.card}>
          <Text style={styles.heading}>{report.category} · {report.target_kind} · {report.status}</Text>
          <Text style={styles.text}>{new Date(report.created_at).toLocaleString()} · {report.author_name || 'Deleted member'}</Text>
          {report.title && <Text style={styles.heading} selectable>{report.title}</Text>}
          <Text style={styles.text} selectable>{report.body || 'This post is no longer available.'}</Text>
          <Text style={styles.text} selectable>Report details: {report.reason || 'None provided.'}</Text>
          {report.thread_id && <QueueButton label="View discussion" disabled={busy} onPress={() => router.push({ pathname: "/threads/[id]", params: { id: report.thread_id } })} />}
          <Text style={styles.small} selectable>Post ID: {report.target_id}</Text>
          {report.resolution && <Text style={styles.text}>Resolution: {report.resolution}</Text>}
          {report.status === 'open' && <View style={styles.row}>
            {<QueueButton label="Dismiss report" disabled={busy} onPress={() => setConfirm({ id: report.id, action: "dismiss" })} />}
            {<QueueButton label="Remove post" disabled={busy} onPress={() => setConfirm({ id: report.id, action: "remove" })} />}
            {report.author_id && <QueueButton label="Remove & suspend author" disabled={busy} onPress={() => setConfirm({ id: report.id, action: "suspend" })} />}
          </View>}
          {confirm?.id === report.id && <View style={styles.confirm}>
            <Text style={styles.text}>{confirm.action === 'dismiss' ? 'Close this report without changing the post?' : confirm.action === 'remove' ? 'Permanently replace this post and author identity with a removed-post notice? Other members’ replies stay.' : 'Remove this post and suspend this account from posting? Other posts remain until separately reviewed. Posting access can later be restored.'}</Text>
            <View style={styles.row}>{<QueueButton label="Cancel" disabled={busy} onPress={() => setConfirm(null)} />}{<QueueButton label="Confirm action" disabled={busy} onPress={() => void act()} />}</View>
          </View>}
        </View>)}
        <Text style={styles.heading}>Posting restrictions</Text>
        {suspensions.length === 0 && loaded && <Text style={styles.text}>No suspended accounts.</Text>}
        {suspensions.map((item) => <View key={item.user_id} style={styles.card}>
          <Text style={styles.small} selectable>Account: {item.user_id}</Text>
          <Text style={styles.text}>Suspended {new Date(item.created_at).toLocaleString()}</Text>
          {confirm?.id === item.user_id ? <><Text style={styles.text}>Restore posting access? Removed content will stay removed.</Text><View style={styles.row}>{<QueueButton label="Cancel" disabled={busy} onPress={() => setConfirm(null)} />}{<QueueButton label="Confirm restore" disabled={busy} onPress={() => void act()} />}</View></> : <QueueButton label="Restore posting access" disabled={busy} onPress={() => setConfirm({ id: item.user_id, action: "restore" })} />}
        </View>)}
      </>}
      {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
    </ScrollView>
  </View>;
}
function QueueButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return <Pressable accessibilityRole="button" style={styles.button} disabled={disabled} onPress={onPress}><Text style={styles.action}>{label}</Text></Pressable>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appBg }, content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.lg },
  heading: { ...font.bold, color: colors.text, fontSize: fontSize.cardTitle },
  text: { ...font.regular, color: colors.text, fontSize: fontSize.body, lineHeight: 23 },
  small: { ...font.regular, color: colors.textMuted, fontSize: fontSize.small },
  card: { backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  action: { ...font.bold, color: colors.accent, fontSize: fontSize.body },
  confirm: { backgroundColor: colors.cream, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md },
});
