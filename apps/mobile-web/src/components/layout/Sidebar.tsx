import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: areas } = useAsync(getAreas, [pathname]);
  const areaList = areas ?? [];

  const isDashboardActive = pathname === '/';
  const isWeeklyActive = pathname === '/weekly-reflection';

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark} />
        <Text style={styles.logoText}>Spiral</Text>
      </View>

      <Pressable
        onPress={() => router.push('/')}
        style={[styles.navRow, styles.navRowIndented, isDashboardActive && styles.navRowActive]}
      >
        <Text style={[styles.navText, isDashboardActive && styles.navTextActive]}>Dashboard</Text>
      </Pressable>

      <Text style={styles.navLabel}>Areas</Text>
      {areaList.map((area) => {
        const isActive = pathname.startsWith(`/area/${area.id}`);
        return (
          <Pressable
            key={area.id}
            onPress={() => router.push(`/area/${area.id}`)}
            style={[styles.navRow, isActive && styles.navRowActive]}
          >
            <View style={[styles.navDot, { backgroundColor: getAreaAccent(areaList, area.id) }]} />
            <Text style={[styles.navText, isActive && styles.navTextActive]}>{area.name}</Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => router.push('/area/new')}
        style={[styles.navRow, styles.navRowIndented]}
      >
        <Text style={styles.navAddText}>+ Add Area</Text>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable
        onPress={() => router.push('/weekly-reflection')}
        style={[styles.navRow, styles.navRowIndented, isWeeklyActive && styles.navRowActive]}
      >
        <Text style={[styles.navText, isWeeklyActive && styles.navTextActive]}>
          Weekly Reflection
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    minWidth: 260,
    backgroundColor: Colors.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  logoMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  logoText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  navLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  navRowIndented: {
    marginLeft: 8,
  },
  navRowActive: {
    backgroundColor: Colors.surface,
  },
  navDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  navText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  navAddText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textMuted,
  },
  navTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
});
