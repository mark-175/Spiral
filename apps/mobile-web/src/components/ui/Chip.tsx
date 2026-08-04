import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface ChipProps {
  label: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}

export function Chip({ label, selected, accent, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? accent : Colors.border,
          backgroundColor: selected ? Colors.surface : 'transparent',
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? Colors.text : Colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
});
