import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { LogRow } from '@/components/ui/LogRow';
import { useActiveArea } from '@/hooks/useActiveArea';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

type HistoryTab = 'daily' | 'weekly';

export default function ReviewHistoryScreen() {
  const router = useRouter();
  const area = useActiveArea();
  const [tab, setTab] = useState<HistoryTab>('daily');

  if (!area) {
    return <AreaNotFound onBack={() => router.push('/')} />;
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

      {tab === 'daily' ? (
        <View>
          {area.reviewHistory.map((entry, index) => (
            <LogRow key={index} dateLabel={entry.dateLabel} text={entry.summary} />
          ))}
        </View>
      ) : (
        <View>
          {area.weeklyHistory.map((entry, index) => (
            <LogRow key={index} dateLabel={entry.weekLabel} text={entry.highlight} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
