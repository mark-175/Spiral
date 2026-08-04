import { Text, View } from 'react-native';

import { BackLink } from '@/components/ui/BackLink';
import { sharedStyles } from '@/theme/sharedStyles';

export function AreaNotFound({ onBack }: { onBack: () => void }) {
  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label="← Dashboard" onPress={onBack} />
      <Text style={sharedStyles.h1}>Area not found</Text>
    </View>
  );
}
