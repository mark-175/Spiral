import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { LogRow } from '@/components/ui/LogRow';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getDailyReviews, getErrorMessage, getWeeklyReflections } from '@/lib/api';
import { formatDateLabel, formatWeekRangeLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

type HistoryTab = 'daily' | 'weekly';

export default function ReviewHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<HistoryTab>('daily');

  const { data: area, loading: areaLoading, error: areaError } = useAsync(() => getArea(id), [id]);
  const { data: dailyReviews, loading: dailyLoading, error: dailyError } = useAsync(
    () => getDailyReviews(id),
    [id],
  );
  const {
    data: weeklyReflections,
    loading: weeklyLoading,
    error: weeklyError,
  } = useAsync(() => getWeeklyReflections(id), [id]);

  if (areaLoading) {
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (areaError) {
    if (areaError instanceof ApiError && areaError.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(areaError)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label={`← ${area.name}`} onPress={() => router.push(`/area/${area.id}`)} />
      <Text style={sharedStyles.h1}>Review History</Text>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('daily')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'daily' && styles.tabTextActive]}>
            Daily Reviews
          </Text>
          <View style={[styles.tabIndicator, tab === 'daily' && styles.tabIndicatorActive]} />
        </Pressable>
        <Pressable onPress={() => setTab('weekly')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'weekly' && styles.tabTextActive]}>
            Weekly Reflections
          </Text>
          <View style={[styles.tabIndicator, tab === 'weekly' && styles.tabIndicatorActive]} />
        </Pressable>
      </View>

      {tab === 'daily' && (
        <View>
          {dailyLoading && <Text style={styles.status}>Loading…</Text>}
          {Boolean(dailyError) && (
            <Text style={styles.errorText}>
              Couldn't load reviews: {getErrorMessage(dailyError)}
            </Text>
          )}
          {dailyReviews && dailyReviews.length === 0 && (
            <Text style={styles.status}>No daily reviews logged yet.</Text>
          )}
          {dailyReviews?.map((review) => (
            <LogRow
              key={review.id}
              dateLabel={formatDateLabel(review.date)}
              text={review.answers.improved}
            />
          ))}
        </View>
      )}

      {tab === 'weekly' && (
        <View>
          {weeklyLoading && <Text style={styles.status}>Loading…</Text>}
          {Boolean(weeklyError) && (
            <Text style={styles.errorText}>
              Couldn't load reflections: {getErrorMessage(weeklyError)}
            </Text>
          )}
          {weeklyReflections && weeklyReflections.length === 0 && (
            <Text style={styles.status}>No weekly reflections logged yet.</Text>
          )}
          {weeklyReflections?.map((reflection) => (
            <LogRow
              key={reflection.id}
              dateLabel={formatWeekRangeLabel(new Date(`${reflection.weekStartDate}T00:00:00Z`))}
              text={reflection.answers.wentWell}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  tab: {
    paddingHorizontal: 4,
    paddingTop: 10,
    marginRight: 20,
  },
  tabText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textMuted,
    paddingBottom: 10,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  tabIndicator: {
    height: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: Colors.text,
  },
});
