import { View, type ViewProps } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { ThemeColor } from '@/theme/tokens';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const overrideColor = scheme === 'dark' ? darkColor : lightColor;

  return (
    <View
      style={[{ backgroundColor: overrideColor ?? theme[type ?? 'background'] }, style]}
      {...otherProps}
    />
  );
}
