import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextArea } from '@/components/ui/TextArea';
import { WEEKLY_QUESTIONS } from '@/data/weeklyQuestions';
import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas, getErrorMessage, saveWeeklyReflection, type WeeklyAnswers } from '@/lib/api';
import { formatWeekRangeLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

const EMPTY_ANSWERS: WeeklyAnswers = {
  wentWell: '',
  couldBeBetter: '',
  prevented: '',
  differently: '',
  proudOf: '',
};

export default function WeeklyReflectionScreen() {
  const router = useRouter();
  const { areaId } = useLocalSearchParams<{ areaId?: string }>();
  const { data: areas, loading, error } = useAsync(getAreas, []);

  const [selectedAreaId, setSelectedAreaId] = useState(areaId ?? '');
  const [answers, setAnswers] = useState<WeeklyAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAreaId && areas && areas.length > 0) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load areas: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!areas || areas.length === 0) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={sharedStyles.h1}>Weekly Reflection</Text>
        <Text style={sharedStyles.subtitle}>Create an Area first to log a reflection.</Text>
      </View>
    );
  }

  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  const handleAreaChange = (nextId: string) => {
    setSelectedAreaId(nextId);
    setAnswers(EMPTY_ANSWERS);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveWeeklyReflection(selectedArea.id, answers);
      router.push(`/area/${selectedArea.id}`);
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <Text style={sharedStyles.h1}>Weekly Reflection</Text>
      <Text style={sharedStyles.subtitle}>{formatWeekRangeLabel()}</Text>

      <View style={styles.chipRow}>
        {areas.map((area) => (
          <Chip
            key={area.id}
            label={area.name}
            accent={getAreaAccent(areas, area.id)}
            selected={area.id === selectedArea.id}
            onPress={() => handleAreaChange(area.id)}
          />
        ))}
      </View>

      {WEEKLY_QUESTIONS.map((question) => (
        <View key={question.key} style={styles.promptBlock}>
          <Text style={styles.promptLabel}>{question.label}</Text>
          <TextArea
            value={answers[question.key]}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [question.key]: text }))}
          />
        </View>
      ))}

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Saving…' : 'Save Reflection'}
          onPress={handleSave}
          disabled={saving}
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
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 12,
  },
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
