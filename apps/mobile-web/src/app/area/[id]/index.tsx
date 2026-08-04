import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage } from '@/lib/api';
import { formatDateLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  if (loading) {
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.status}>Loading area…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const importanceLabel = `${String(area.importance).padStart(2, '0')} / 10`;

  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label="← Dashboard" onPress={() => router.push('/')} />

      <View style={styles.headerRow}>
        <Text style={sharedStyles.h1}>{area.name}</Text>
        <Text style={styles.importanceBadge}>{importanceLabel}</Text>
        <View style={styles.headerSpacer} />
        <Text style={styles.inlineLink} onPress={() => router.push(`/area/${area.id}/edit`)}>
          Edit Area →
        </Text>
      </View>
      {area.description && <Text style={sharedStyles.description}>{area.description}</Text>}

      <SectionLabel>Current Goal</SectionLabel>
      {area.activeGoal ? (
        <View style={styles.goalCard}>
          <View style={styles.goalTopRow}>
            <View>
              <Text style={styles.goalName}>{area.activeGoal.name}</Text>
              {area.activeGoal.targetDate && (
                <Text style={styles.goalDate}>
                  Target: {formatDateLabel(area.activeGoal.targetDate)}
                </Text>
              )}
            </View>
            <Text
              style={styles.inlineLink}
              onPress={() => router.push(`/area/${area.id}/goal-edit`)}
            >
              Edit →
            </Text>
          </View>
          {area.activeGoal.description && (
            <Text style={styles.goalDesc}>{area.activeGoal.description}</Text>
          )}
        </View>
      ) : (
        <View style={styles.goalCard}>
          <Text style={styles.goalDesc}>No active goal yet.</Text>
          <View style={styles.setGoalAction}>
            <Button label="Set a Goal" onPress={() => router.push(`/area/${area.id}/goal-edit`)} />
          </View>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
  setGoalAction: {
    marginTop: 16,
  },
});
