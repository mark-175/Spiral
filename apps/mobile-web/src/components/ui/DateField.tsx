import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
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

interface DateParts {
  year: string;
  month: string;
  day: string;
}

function splitValue(value: string): DateParts {
  const parts = value ? value.split('-') : [];
  return { year: parts[0] ?? '', month: parts[1] ?? '', day: parts[2] ?? '' };
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ value, onChange }: DateFieldProps) {
  const [year, setYear] = useState(() => splitValue(value).year);
  const [month, setMonth] = useState(() => splitValue(value).month);
  const [day, setDay] = useState(() => splitValue(value).day);

  useEffect(() => {
    const next = splitValue(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => String(currentYear + i));

  const maxDay = year && month ? daysInMonth(Number(year), Number(month)) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));

  const update = (nextYear: string, nextMonth: string, nextDay: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);

    if (!nextYear || !nextMonth || !nextDay) {
      onChange('');
      return;
    }
    const clampedDay = String(
      Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth))),
    ).padStart(2, '0');
    onChange(`${nextYear}-${nextMonth}-${clampedDay}`);
  };

  const clear = () => {
    setYear('');
    setMonth('');
    setDay('');
    onChange('');
  };

  return (
    <View style={styles.row}>
      <Picker
        style={styles.pickerNarrow}
        selectedValue={day}
        onValueChange={(next) => update(year, month, String(next))}
      >
        <Picker.Item label="Day" value="" color={Colors.textMuted} />
        {dayOptions.map((d) => (
          <Picker.Item key={d} label={d} value={d} />
        ))}
      </Picker>
      <Picker
        style={styles.picker}
        selectedValue={month}
        onValueChange={(next) => update(year, String(next), day)}
      >
        <Picker.Item label="Month" value="" color={Colors.textMuted} />
        {MONTHS.map((label, index) => (
          <Picker.Item key={label} label={label} value={String(index + 1).padStart(2, '0')} />
        ))}
      </Picker>
      <Picker
        style={styles.pickerNarrow}
        selectedValue={year}
        onValueChange={(next) => update(String(next), month, day)}
      >
        <Picker.Item label="Year" value="" color={Colors.textMuted} />
        {yearOptions.map((y) => (
          <Picker.Item key={y} label={y} value={y} />
        ))}
      </Picker>
      {(year || month || day) && (
        <Text style={styles.clearLink} onPress={clear}>
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
