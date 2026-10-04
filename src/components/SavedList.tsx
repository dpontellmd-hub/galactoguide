import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthPrompt } from './auth-prompt';
import { useAuth } from '@/context/AuthContext';
import { SavedEntryCard } from './saved-entry-card';
import { useFavorites } from '@/context/FavoritesContext';
import { getAllSubstances } from '@/data/repository';
import type { SubstanceWithKind } from '@/data/types';
import { font, fontSize, useThemedStyles, type ThemeColors } from '@/theme';

interface Props {
  /** Remove mode: cards show a remove button. */
  editing?: boolean;
}

const COLLAPSED_SAVED_LIMIT = 6;

/**
 * The saved-entries grid in Home's SAVED section. Cards keep as-saved
 * order (favorites Set preserves insertion order).
 */
export function SavedList({ editing = false }: Props) {
  const router = useRouter();
  const { user, hydrated: authHydrated } = useAuth();
  const { favorites, toggleFavorite, hydrated } = useFavorites();
  const styles = useThemedStyles(makeStyles);
  if (!authHydrated || (user && !hydrated)) {
    return <ActivityIndicator accessibilityLabel="Loading saved entries" />;
  }
  if (!user) {
    return (
      <AuthPrompt
        icon="bookmark-outline"
        title="Keep your favorites here"
        body="Sign in or create an account to save entries and find them here whenever you need them."
        accessibilityLabel="Sign in or create an account to save entries"
      />
    );
  }
  const all = getAllSubstances();
  const saved = [...favorites]
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  if (saved.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Nothing saved yet — tap the bookmark on any entry to keep it here.
        </Text>
      </View>
    );
  }

  return (
    <SavedEntryGrid
      key={user.id}
      saved={saved}
      onOpen={(s) => router.push({ pathname: '/substance/[id]', params: { id: s.id, kind: s.kind } })}
      onRemove={editing ? (s) => toggleFavorite(s.id) : undefined}
    />
  );
}

export function SavedEntryGrid({ saved, onOpen, onRemove }: {
  saved: SubstanceWithKind[];
  onOpen: (substance: SubstanceWithKind) => void;
  onRemove?: (substance: SubstanceWithKind) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  const hasMore = saved.length > COLLAPSED_SAVED_LIMIT;
  const visibleSaved = expanded ? saved : saved.slice(0, COLLAPSED_SAVED_LIMIT);

  // Removing back down to six resets the next overflow to its compact state.
  if (!hasMore && expanded) setExpanded(false);
  return (
    <View style={styles.grid} testID="saved-grid">
      {Array.from({ length: Math.ceil(visibleSaved.length / 2) }, (_, row) => (
        <View key={row} style={styles.gridRow}>
          {visibleSaved.slice(row * 2, row * 2 + 2).map((s) => (
            <SavedEntryCard
              key={`${s.kind}-${s.id}`}
              substance={s}
              onPress={() => onOpen(s)}
              onRemove={onRemove ? () => onRemove(s) : undefined}
            />
          ))}
          {row * 2 + 1 >= visibleSaved.length && <View style={styles.emptyCell} />}
        </View>
      ))}
      {hasMore && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less saved items' : 'Show more saved items'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
        >
          <Text style={styles.showMoreText}>
            {expanded ? 'Show less' : `Show more (${saved.length - COLLAPSED_SAVED_LIMIT})`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    grid: { gap: 10 },
    showMore: {
      alignSelf: 'center',
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    showMoreText: {
      ...font.semibold,
      fontSize: fontSize.small,
      color: colors.textSecondary,
    },
    pressed: { opacity: 0.65 },
    gridRow: { flexDirection: 'row', gap: 10 },
    emptyCell: { flex: 1, minWidth: 0, borderWidth: 1.5, borderColor: 'transparent' },
    empty: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
    },
    emptyText: {
      ...font.semibold,
      fontSize: fontSize.small,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
