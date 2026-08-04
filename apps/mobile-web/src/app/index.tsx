import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaCard } from '@/components/AreaCard';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas, getErrorMessage } from '@/lib/api';
import { formatTodayLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: areas, loading, error, refetch } = useAsync(getAreas, []);

  return (
    <View style={sharedStyles.pageWrap}>
      <View style={styles.header}>
        <Text style={sharedStyles.eyebrow}>{formatTodayLabel()}</Text>
        <Text style={sharedStyles.h1}>Areas of Development</Text>
        <Text style={sharedStyles.subtitle}>Sorted by importance</Text>
      </View>

      {loading && <Text style={styles.status}>Loading areas…</Text>}

      {Boolean(error) && (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>Couldn't load areas: {getErrorMessage(error)}</Text>
          <Button label="Retry" variant="secondary" onPress={refetch} />
        </View>
      )}

      {!loading && !error && areas && areas.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Areas yet</Text>
          <Text style={styles.emptyBody}>
            Areas of Development are the identities you're continuously growing.
          </Text>
          <Button label="Create your first Area" onPress={() => router.push('/area/new')} />
        </View>
      )}

      {!loading && !error && areas && areas.length > 0 && (
        <View style={styles.cardList}>
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              accent={getAreaAccent(areas, area.id)}
              onPress={() => router.push(`/area/${area.id}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 36,
  },
  cardList: {
    gap: 10,
  },
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorBlock: {
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'flex-start',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    maxWidth: 420,
  },
});
