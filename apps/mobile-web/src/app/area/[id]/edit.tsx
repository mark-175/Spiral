import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useActiveArea } from '@/hooks/useActiveArea';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaEditScreen() {
  const router = useRouter();
  const area = useActiveArea();

  const [name, setName] = useState(area?.name ?? '');
  const [description, setDescription] = useState(area?.description ?? '');
  const [importance, setImportance] = useState(area ? String(area.importance) : '');

  if (!area) {
    return <AreaNotFound onBack={() => router.push('/')} />;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />
      <Text style={[sharedStyles.h1, styles.title]}>Edit Area</Text>

      <Field label="Name">
        <TextField value={name} onChangeText={setName} />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} />
      </Field>

      <Field label="Importance">
        <View style={styles.importanceRow}>
          <TextField
            value={importance}
            onChangeText={setImportance}
            keyboardType="number-pad"
            width={80}
          />
          <Text style={styles.importanceHint}>
            1 = low priority · 10 = defining priority right now
          </Text>
        </View>
      </Field>

      <View style={sharedStyles.formActions}>
        <Button label="Save Area" onPress={goBackToDetail} />
        <Button label="Cancel" variant="secondary" onPress={goBackToDetail} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 22,
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  importanceHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
