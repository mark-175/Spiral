import { StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 12,
  },
});
