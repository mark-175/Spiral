import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ value, onChange }: DateFieldProps) {
  const parts = value ? value.split('-') : [];
  const yearPart = parts[0] ?? '';
  const monthPart = parts[1] ?? '';
  const dayPart = parts[2] ?? '';

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => String(currentYear + i));

  const maxDay = yearPart && monthPart ? daysInMonth(Number(yearPart), Number(monthPart)) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange('');
      return;
    }
    const clampedDay = String(
      Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth))),
    ).padStart(2, '0');
    onChange(`${nextYear}-${nextMonth}-${clampedDay}`);
  };

  return (
    <View style={styles.row}>
      <Picker
        style={styles.pickerNarrow}
        selectedValue={dayPart}
        onValueChange={(next) => emit(yearPart, monthPart, String(next))}
      >
        <Picker.Item label="Day" value="" color={Colors.textMuted} />
        {dayOptions.map((day) => (
          <Picker.Item key={day} label={day} value={day} />
        ))}
      </Picker>
      <Picker
        style={styles.picker}
        selectedValue={monthPart}
        onValueChange={(next) => emit(yearPart, String(next), dayPart)}
      >
        <Picker.Item label="Month" value="" color={Colors.textMuted} />
        {MONTHS.map((label, index) => (
          <Picker.Item key={label} label={label} value={String(index + 1).padStart(2, '0')} />
        ))}
      </Picker>
      <Picker
        style={styles.pickerNarrow}
        selectedValue={yearPart}
        onValueChange={(next) => emit(String(next), monthPart, dayPart)}
      >
        <Picker.Item label="Year" value="" color={Colors.textMuted} />
        {yearOptions.map((year) => (
          <Picker.Item key={year} label={year} value={year} />
        ))}
      </Picker>
      {value.length > 0 && (
        <Text style={styles.clearLink} onPress={() => onChange('')}>
          Clear
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  picker: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    color: Colors.text,
    minWidth: 140,
    height: 40,
  },
  pickerNarrow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    color: Colors.text,
    minWidth: 84,
    height: 40,
  },
  clearLink: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
