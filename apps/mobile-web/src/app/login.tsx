import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage, login } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (email.trim().length === 0 || password.length === 0) {
      setError('Email and password are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={sharedStyles.formWrap}>
        <Text style={sharedStyles.h1}>Log In</Text>
        <Text style={[sharedStyles.subtitle, styles.subtitle]}>Welcome back to Spiral.</Text>

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
            label={submitting ? 'Logging in…' : 'Log In'}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </View>

        <Text style={styles.switchLink} onPress={() => router.push('/signup')}>
          Don't have an account? Sign up
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
