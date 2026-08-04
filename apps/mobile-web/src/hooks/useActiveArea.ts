import { useLocalSearchParams } from 'expo-router';

import { getAreaById } from '@/data/areas';

export function useActiveArea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return getAreaById(id);
}
