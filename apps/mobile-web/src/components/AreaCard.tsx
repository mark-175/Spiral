import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AreaSummary } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';

export function AreaCard({
  area,
  accent,
  onPress,
}: {
  area: AreaSummary;
  accent: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const importanceLabel = `${String(area.importance).padStart(2, '0')} / 10`;
  const todayGlyph = area.loggedToday ? '✓' : '○';
  const todayText = area.loggedToday ? 'Logged today' : 'Not yet today';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.card,
        {
          borderLeftColor: accent,
          backgroundColor: hovered ? Colors.surfaceHover : Colors.surface,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.name}>{area.name}</Text>
          <Text style={styles.importanceBadge}>{importanceLabel}</Text>
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.todayGlyph}>{todayGlyph}</Text>
          <Text style={styles.todayText}>{todayText}</Text>
        </View>
      </View>
      <Text style={styles.goalText}>
        {area.activeGoal ? area.activeGoal.name : 'No active goal yet'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  importanceBadge: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayGlyph: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    width: 14,
    textAlign: 'center',
  },
  todayText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  goalText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 20,
  },
});
