import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage, signup } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (email.trim().length === 0) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signup(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={sharedStyles.formWrap}>
        <Text style={sharedStyles.h1}>Create Account</Text>
        <Text style={[sharedStyles.subtitle, styles.subtitle]}>
          Start tracking who you're becoming.
        </Text>

        <Field label="Email">
          <TextField
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Field>

        <Field label="Password">
          <TextField value={password} onChangeText={setPassword} secureTextEntry />
        </Field>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={sharedStyles.formActions}>
          <Button
            label={submitting ? 'Creating account…' : 'Sign Up'}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </View>

        <Text style={styles.switchLink} onPress={() => router.push('/login')}>
          Already have an account? Log in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
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
  switchLink: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
});
