import { StyleSheet, Text, View } from 'react-native';
import { formatForumDate } from '@/data/forum';
import { font, fontSize, radius, useThemedStyles, type ThemeColors } from '@/theme';

function avatarInitial(name: string): string {
  return name.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? '•';
}

export function ForumAuthorRow({
  name,
  createdAt,
  isSample,
}: {
  name: string;
  createdAt: string;
  isSample?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{avatarInitial(name)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {isSample ? 'Example discussion' : formatForumDate(createdAt)}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
    avatar: {
      width: 31,
      height: 31,
      borderRadius: radius.round,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: { ...font.extrabold, fontSize: fontSize.small, color: colors.textSecondary },
    copy: { flex: 1, minWidth: 0 },
    name: { ...font.bold, fontSize: fontSize.small, color: colors.text },
    meta: { ...font.semibold, fontSize: fontSize.tiny, color: colors.textFaint },
  });
