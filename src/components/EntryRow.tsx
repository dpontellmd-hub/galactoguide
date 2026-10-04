import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chevron } from './Chevron';
import { DirectionIndicator } from './DirectionIndicator';
import { EvidenceMeter } from './EvidenceMeter';
import { SubstanceIcon } from './SubstanceIcon';
import { usePortal } from '@/context/PortalContext';
import { useSituations } from '@/context/SituationsContext';
import type { SubstanceWithKind } from '@/data/types';
import {
  directionLabel,
  directionOf,
  evidenceCaption,
  safetyChipColors,
  safetyValueLabel,
  situationShortLabels,
  typeLabel,
} from '@/lib/format';
import { worstSafety } from '@/lib/recommend';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  substance: SubstanceWithKind;
  onPress: () => void;
  /** Hairline under the row (all but the last row in a card). */
  showDivider?: boolean;
  /** Renders a remove button instead of the chevron (Saved edit mode). */
  onRemove?: () => void;
}

/**
 * The core list row (Home collections/saved list, A–Z, search results):
 * name · chevron / effect on milk production / evidence / summary.
 */
export function EntryRow({ substance: d, onPress, showDivider = false, onRemove }: Props) {
  const { colors } = useTheme();
  const { portal } = usePortal();
  const { situations } = useSituations();
  const styles = useThemedStyles(makeStyles);
  const direction = directionOf(d);
  const summary =
    portal === 'provider' ? (d.verdict_p ?? d.short_p) : (d.verdict_m ?? d.short_m);
  const worstLevel = worstSafety(d.safety, situations);
  // Only the warning levels surface a badge; recommend / "may use" stay quiet.
  const flagged = worstLevel === 'caution' || worstLevel === 'avoid' ? worstLevel : null;
  const safetyColors = flagged ? safetyChipColors(flagged, colors) : null;
  const flaggedSituations = flagged ? situations.filter((s) => d.safety[s] === flagged) : [];
  const safetyLine = flagged
    ? `${flaggedSituations.map((s) => situationShortLabels[s]).join(', ')}: ${safetyValueLabel(flagged)}`
    : null;
  return (
    // Outer View so the remove button isn't nested inside another button
    // (invalid DOM on web).
    <View style={[styles.row, showDivider && styles.divider]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${d.name}, ${typeLabel(d.type)}, ${directionLabel(direction)}, ${evidenceCaption(d.evidence, d.conflicting)}${
          safetyLine ? `, ${safetyLine}` : ''
        }`}
      >
        <View style={styles.topRow}>
          <SubstanceIcon substance={d} />
          <Text style={styles.name}>{d.name}</Text>
          {!onRemove && <Chevron />}
        </View>
        <View style={styles.ratings}>
          <DirectionIndicator direction={direction} />
          <EvidenceMeter
            score={d.evidence}
            showCaption
            mixedResults={d.conflicting}
            align="left"
          />
        </View>
        {flagged && safetyColors && (
          <View style={styles.safetyRow}>
            <Ionicons
              name={flagged === 'avoid' ? 'close-circle' : 'warning'}
              size={15}
              color={flagged === 'caution' ? colors.caramel : safetyColors.fg}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[styles.safetyText, { color: safetyColors.fg }]}>
              {safetyLine}
            </Text>
          </View>
        )}
        <Text style={styles.summary}>{summary}</Text>
      </Pressable>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${d.name} from saved`}
          hitSlop={8}
        >
          <Ionicons name="remove-circle" size={22} color={colors.directionFuge.header} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { paddingVertical: 13, paddingHorizontal: 18 },
    divider: { borderBottomWidth: 1.5, borderBottomColor: colors.divider },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { ...font.extrabold, fontSize: fontSize.rowName, color: colors.text, flex: 1 },
    ratings: { flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginTop: 10 },
    safetyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
    safetyText: { ...font.bold, fontSize: fontSize.small, flexShrink: 1 },
    summary: {
      ...font.semibold,
      fontSize: fontSize.base,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 9,
    },
    remove: { position: 'absolute', right: 14, top: 13, padding: 4 },
  });
