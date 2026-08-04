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
import { sharedStyles } from '@/theme/sharedStyles';

export default function GoalEditScreen() {
  const router = useRouter();
  const area = useActiveArea();

  const [name, setName] = useState(area?.goal.name ?? '');
  const [targetDate, setTargetDate] = useState(area?.goal.targetDateISO ?? '');
  const [description, setDescription] = useState(area?.goal.description ?? '');

  if (!area) {
    return <AreaNotFound onBack={() => router.push('/')} />;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />
      <Text style={[sharedStyles.h1, styles.title]}>Edit Goal</Text>

      <Field label="Goal Name">
        <TextField value={name} onChangeText={setName} />
      </Field>

      <Field label="Target Date">
        <TextField
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="YYYY-MM-DD"
          width={200}
        />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} />
      </Field>

      <View style={sharedStyles.formActions}>
        <Button label="Save Goal" onPress={goBackToDetail} />
        <Button label="Cancel" variant="secondary" onPress={goBackToDetail} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 22,
  },
});
