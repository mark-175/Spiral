import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Sidebar } from '@/components/layout/Sidebar';
import { Colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Sidebar />
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <Slot />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.bg,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    paddingVertical: 56,
    paddingHorizontal: 48,
  },
});
