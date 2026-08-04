import { Text, View } from 'react-native';

import { sharedStyles } from '@/theme/sharedStyles';

export function LogRow({ dateLabel, text }: { dateLabel: string; text: string }) {
  return (
    <View style={sharedStyles.logRow}>
      <Text style={sharedStyles.logDate}>{dateLabel}</Text>
      <Text style={sharedStyles.logText}>{text}</Text>
    </View>
  );
}
