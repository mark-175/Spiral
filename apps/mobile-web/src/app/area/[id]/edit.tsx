import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ImportanceSlider } from '@/components/ui/ImportanceSlider';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage, updateArea } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (area) {
      setName(area.name);
      setDescription(area.description ?? '');
      setImportance(area.importance);
    }
  }, [area]);

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
    if (name.trim().length === 0) {
      setSaveError('Name is required');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateArea(area.id, {
        name: name.trim(),
        description: description.trim(),
        importance,
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
      <Text style={[sharedStyles.h1, styles.title]}>Edit Area</Text>

      <Field label="Name">
        <TextField value={name} onChangeText={setName} />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} />
      </Field>

      <Field label="Importance">
        <ImportanceSlider value={importance} onChange={setImportance} />
      </Field>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button label={saving ? 'Saving…' : 'Save Area'} onPress={handleSave} disabled={saving} />
        <Button label="Cancel" variant="secondary" onPress={goBackToDetail} disabled={saving} />
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
  title: {
    marginBottom: 22,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
    marginBottom: 8,
  },
});
