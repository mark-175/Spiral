import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage, saveDailyReview } from '@/lib/api';
import { formatTodayLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DailyReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  const [improved, setImproved] = useState('');
  const [couldImprove, setCouldImprove] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  const handleSave = async () => {
    if (improved.trim().length === 0) {
      setSaveError('This field is required');
      return;
    }
    if (couldImprove.trim().length === 0) {
      setSaveError('This field is required');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveDailyReview(area.id, {
        improved: improved.trim(),
        couldImprove: couldImprove.trim(),
        notes: notes.trim(),
      });
      goBackToDetail();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />

      <Text style={sharedStyles.h1}>Daily Review</Text>
      <Text style={sharedStyles.subtitle}>
        {formatTodayLabel()} · {area.name}
      </Text>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>How did you improve yourself as a {area.name} today?</Text>
        <TextArea value={improved} onChangeText={setImproved} minHeight={84} />
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>
          What didn't go very well, and how could you improve it next time?
        </Text>
        <TextArea value={couldImprove} onChangeText={setCouldImprove} minHeight={84} />
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>Anything else worth remembering?</Text>
        <TextArea value={notes} onChangeText={setNotes} placeholder="Optional notes" minHeight={56} />
      </View>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Saving…' : "Save Today's Review"}
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
    marginBottom: 8,
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
