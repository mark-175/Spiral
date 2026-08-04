import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface TextFieldProps extends TextInputProps {
  width?: number;
}

export function TextField({ style, width, ...rest }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.textMuted}
      style={[styles.base, width ? { width } : styles.fullWidth, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    fontFamily: Fonts.sans,
  },
  fullWidth: {
    width: '100%',
  },
});
