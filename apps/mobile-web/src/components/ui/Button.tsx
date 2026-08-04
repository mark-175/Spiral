import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, isPrimary ? styles.primary : styles.secondary, disabled && styles.disabled]}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Colors.text,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  secondaryLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
