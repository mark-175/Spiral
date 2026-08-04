import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaCard } from '@/components/AreaCard';
import { getAreasByImportance } from '@/data/areas';
import { formatTodayLabel } from '@/lib/date';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DashboardScreen() {
  const router = useRouter();
  const areas = getAreasByImportance();

  return (
    <View style={sharedStyles.pageWrap}>
      <View style={styles.header}>
        <Text style={sharedStyles.eyebrow}>{formatTodayLabel()}</Text>
        <Text style={sharedStyles.h1}>Areas of Development</Text>
        <Text style={sharedStyles.subtitle}>Sorted by importance</Text>
      </View>

      <View style={styles.cardList}>
        {areas.map((area) => (
          <AreaCard key={area.id} area={area} onPress={() => router.push(`/area/${area.id}`)} />
        ))}
      </View>
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
});
