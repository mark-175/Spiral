import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
