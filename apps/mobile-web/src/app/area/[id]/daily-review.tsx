import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { useActiveArea } from '@/hooks/useActiveArea';
import { formatTodayLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DailyReviewScreen() {
  const router = useRouter();
  const area = useActiveArea();

  const [madeProgress, setMadeProgress] = useState(true);
  const [whatHelped, setWhatHelped] = useState(area?.dailyPrompt2 ?? '');
  const [notes, setNotes] = useState('');

  if (!area) {
    return <AreaNotFound onBack={() => router.push('/')} />;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />

      <View style={styles.headerRow}>
        <View style={[styles.headerDot, { backgroundColor: area.accent }]} />
        <Text style={sharedStyles.h1}>Daily Review</Text>
      </View>
      <Text style={sharedStyles.subtitle}>
        {formatTodayLabel()} · {area.name}
      </Text>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>Did you make meaningful progress today?</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMadeProgress(true)}
            style={[styles.toggle, madeProgress ? styles.toggleActive : styles.toggleInactive]}
          >
            <Text style={madeProgress ? styles.toggleActiveText : styles.toggleInactiveText}>
              Yes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMadeProgress(false)}
            style={[styles.toggle, !madeProgress ? styles.toggleActive : styles.toggleInactive]}
          >
            <Text style={!madeProgress ? styles.toggleActiveText : styles.toggleInactiveText}>
              No
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>What did you do that made you better?</Text>
        <TextArea value={whatHelped} onChangeText={setWhatHelped} minHeight={84} />
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>Anything else worth remembering?</Text>
        <TextArea
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          minHeight={56}
        />
      </View>

      <View style={sharedStyles.formActions}>
        <Button label="Save Today's Review" onPress={goBackToDetail} />
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  toggleActive: {
    backgroundColor: Colors.text,
  },
  toggleInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleActiveText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  toggleInactiveText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
