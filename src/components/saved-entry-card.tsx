import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DirectionTriangle } from './DirectionIndicator';
import { EvidenceMeter } from './EvidenceMeter';
import { SubstanceIcon } from './SubstanceIcon';
import type { SubstanceWithKind } from '@/data/types';
import { directionLabel, directionOf, evidenceCaption, typeLabel } from '@/lib/format';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  substance: SubstanceWithKind;
  onPress: () => void;
  onRemove?: () => void;
}

/** Compact identity and ratings for the two-column Saved grid. */
export function SavedEntryCard({ substance, onPress, onRemove }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const direction = directionOf(substance);

  return (
    <View style={styles.card} testID="saved-entry-card">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${substance.name}, ${typeLabel(substance.type)}, ${directionLabel(direction)}, ${evidenceCaption(substance.evidence, substance.conflicting)}`}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <Text style={styles.name}>{substance.name}</Text>
        <View style={styles.ratings}>
          {direction === 'none' ? (
            <View style={styles.neutralDirection} />
          ) : (
            <DirectionTriangle
              direction={direction}
              width={11}
              color={direction === 'raise' ? colors.directionGogue.header : colors.directionFuge.header}
            />
          )}
          <EvidenceMeter
            score={substance.evidence}
            mixedResults={substance.conflicting}
            align="left"
          />
          <View style={styles.icon}>
            {!onRemove && <SubstanceIcon substance={substance} />}
          </View>
        </View>
      </Pressable>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${substance.name} from saved`}
        >
          <Ionicons name="remove-circle" size={22} color={colors.directionFuge.header} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
    },
    content: { flex: 1, minHeight: 104, padding: 12, gap: 8, borderRadius: 20 },
    pressed: { opacity: 0.7 },
    name: { ...font.extrabold, fontSize: fontSize.rowName, color: colors.text },
    ratings: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
    icon: { marginLeft: 'auto', width: 30, height: 30 },
    neutralDirection: { width: 11, height: 2, backgroundColor: colors.directionNone },
    remove: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
