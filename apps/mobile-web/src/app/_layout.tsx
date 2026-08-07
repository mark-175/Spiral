import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Sidebar } from '@/components/layout/Sidebar';
import { useAsync } from '@/hooks/useAsync';
import { getCurrentUser } from '@/lib/api';
import { Colors } from '@/theme/tokens';

const PUBLIC_ROUTES = ['/login', '/signup'];

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, loading } = useAsync(getCurrentUser, [pathname]);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
    if (isAuthenticated && isPublicRoute) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, isPublicRoute, router]);

  if (isAuthenticated && !isPublicRoute) {
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Slot />
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
