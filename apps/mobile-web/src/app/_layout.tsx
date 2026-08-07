import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Sidebar } from '@/components/layout/Sidebar';
import { useAsync } from '@/hooks/useAsync';
import { getCurrentUser } from '@/lib/api';
import { Breakpoints, Colors, Fonts } from '@/theme/tokens';

const PUBLIC_ROUTES = ['/login', '/signup'];
const TOP_BAR_HEIGHT = 56;

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, loading } = useAsync(getCurrentUser, [pathname]);
  const { width } = useWindowDimensions();
  const isMobile = width < Breakpoints.mobile;
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Close the drawer on any route change, however it was triggered
  // (nav tap, back/forward, logout redirect).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (isAuthenticated && !isPublicRoute) {
    return (
      <View style={[styles.root, { flexDirection: isMobile ? 'column' : 'row' }]}>
        <StatusBar style="light" />
        {isMobile ? (
          <>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => setDrawerOpen((open) => !open)}
                style={styles.menuButton}
                hitSlop={8}
              >
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
              </Pressable>
              <Text style={styles.topBarTitle}>Spiral</Text>
            </View>
            {drawerOpen && (
              <>
                <Pressable
                  style={styles.backdrop}
                  onPress={() => setDrawerOpen(false)}
                  accessibilityLabel="Close menu"
                />
                <Sidebar style={styles.drawer} />
              </>
            )}
          </>
        ) : (
          <Sidebar />
        )}
        <ScrollView
          style={styles.main}
          contentContainerStyle={[styles.mainContent, isMobile && styles.mainContentMobile]}
        >
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
    backgroundColor: Colors.bg,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    paddingVertical: 56,
    paddingHorizontal: 48,
  },
  mainContentMobile: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: 16,
    backgroundColor: Colors.sidebarBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  menuBar: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.text,
  },
  topBarTitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  backdrop: {
    position: 'absolute',
    top: TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: TOP_BAR_HEIGHT,
    left: 0,
    bottom: 0,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
