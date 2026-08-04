import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 22,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
});
