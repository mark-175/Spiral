import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextArea } from '@/components/ui/TextArea';
import { getAreasByImportance, WEEKLY_QUESTIONS } from '@/data/areas';
import { formatWeekRangeLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function WeeklyReflectionScreen() {
  const router = useRouter();
  const { areaId } = useLocalSearchParams<{ areaId?: string }>();
  const areas = getAreasByImportance();

  const [selectedAreaId, setSelectedAreaId] = useState(areaId ?? areas[0]?.id ?? '');
  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  if (!selectedArea) {
    return null;
  }

  return (
    <View style={sharedStyles.formWrap}>
      <Text style={sharedStyles.h1}>Weekly Reflection</Text>
      <Text style={sharedStyles.subtitle}>{formatWeekRangeLabel()}</Text>

      <View style={styles.chipRow}>
        {areas.map((area) => (
          <Chip
            key={area.id}
            label={area.name}
            accent={area.accent}
            selected={area.id === selectedArea.id}
            onPress={() => setSelectedAreaId(area.id)}
          />
        ))}
      </View>

      {WEEKLY_QUESTIONS.map((question) => (
        <View key={question.key} style={styles.promptBlock}>
          <Text style={styles.promptLabel}>{question.label}</Text>
          <TextArea
            key={`${selectedArea.id}-${question.key}`}
            defaultValue={selectedArea.weeklyAnswers[question.key]}
          />
        </View>
      ))}

      <View style={sharedStyles.formActions}>
        <Button label="Save Reflection" onPress={() => router.push(`/area/${selectedArea.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  promptBlock: {
    marginBottom: 28,
  },
  promptLabel: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 10,
  },
});
