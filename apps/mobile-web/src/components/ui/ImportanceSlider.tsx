import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface ImportanceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ImportanceSlider({ value, onChange }: ImportanceSliderProps) {
  return (
    <View style={styles.row}>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Colors.text}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.text}
      />
      <Text style={styles.value}>{String(value).padStart(2, '0')} / 10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slider: {
    flex: 1,
    maxWidth: 280,
    height: 40,
  },
  value: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textMuted,
    width: 56,
  },
});
