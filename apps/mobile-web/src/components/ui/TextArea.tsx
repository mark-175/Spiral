import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface TextAreaProps extends TextInputProps {
  minHeight?: number;
}

export function TextArea({ style, minHeight = 96, ...rest }: TextAreaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={Colors.textMuted}
      style={[styles.base, { minHeight }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
    fontFamily: Fonts.sans,
  },
});
