import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ImportanceSlider } from '@/components/ui/ImportanceSlider';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { createArea, getErrorMessage } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function CreateAreaScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBackToDashboard = () => router.push('/');

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const area = await createArea({
        name: name.trim(),
        description: description.trim() || undefined,
        importance,
      });
      router.push(`/area/${area.id}/goal-edit`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label="← Dashboard" onPress={goBackToDashboard} />
      <Text style={[sharedStyles.h1, styles.title]}>Create Area</Text>
      <Text style={[sharedStyles.subtitle, styles.subtitle]}>
        Areas are identities you're continuously growing — not one-off projects.
      </Text>

      <Field label="Name">
        <TextField value={name} onChangeText={setName} placeholder="e.g. Developer" />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} placeholder="Optional" />
      </Field>

      <Field label="Importance">
        <ImportanceSlider value={importance} onChange={setImportance} />
      </Field>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Creating…' : 'Create Area'}
          onPress={handleSave}
          disabled={saving}
        />
        <Button label="Cancel" variant="secondary" onPress={goBackToDashboard} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
  },
});
