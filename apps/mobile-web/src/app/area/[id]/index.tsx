import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { Button } from '@/components/ui/Button';
import { LogRow } from '@/components/ui/LogRow';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { BackLink } from '@/components/ui/BackLink';
import { useActiveArea } from '@/hooks/useActiveArea';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaDetailScreen() {
  const router = useRouter();
  const area = useActiveArea();

  if (!area) {
    return <AreaNotFound onBack={() => router.push('/')} />;
  }

  const importanceLabel = `${String(area.importance).padStart(2, '0')} / 10`;

  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label="← Dashboard" onPress={() => router.push('/')} />

      <View style={styles.headerRow}>
        <View style={[styles.headerDot, { backgroundColor: area.accent }]} />
        <Text style={sharedStyles.h1}>{area.name}</Text>
        <Text style={styles.importanceBadge}>{importanceLabel}</Text>
        <View style={styles.headerSpacer} />
        <Text style={styles.inlineLink} onPress={() => router.push(`/area/${area.id}/edit`)}>
          Edit Area →
        </Text>
      </View>
      <Text style={sharedStyles.description}>{area.description}</Text>

      <SectionLabel>Current Goal</SectionLabel>
      <View style={styles.goalCard}>
        <View style={styles.goalTopRow}>
          <View>
            <Text style={styles.goalName}>{area.goal.name}</Text>
            <Text style={styles.goalDate}>Target: {area.goal.targetDateLabel}</Text>
          </View>
          <Text style={styles.inlineLink} onPress={() => router.push(`/area/${area.id}/goal-edit`)}>
            Edit →
          </Text>
        </View>
        <Text style={styles.goalDesc}>{area.goal.description}</Text>
      </View>

      <View style={sharedStyles.actionRow}>
        <Button
          label="Log Today's Review"
          onPress={() => router.push(`/area/${area.id}/daily-review`)}
        />
        <Button
          label="Review History"
          variant="secondary"
          onPress={() => router.push(`/area/${area.id}/history`)}
        />
        <Button
          label="Weekly Reflection"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/weekly-reflection', params: { areaId: area.id } })
          }
        />
      </View>

      <SectionLabel>Action Log</SectionLabel>
      <View>
        {area.actionLog.map((entry, index) => (
          <LogRow key={index} dateLabel={entry.dateLabel} text={entry.text} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerSpacer: {
    flex: 1,
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
  inlineLink: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 36,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalName: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  goalDate: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  goalDesc: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 480,
  },
});
