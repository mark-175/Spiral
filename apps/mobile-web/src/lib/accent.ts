import type { AreaSummary } from './api';
import { AreaAccentPalette } from '@/theme/tokens';

export function getAreaAccent(areas: AreaSummary[], areaId: string): string {
  const sorted = [...areas].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const index = sorted.findIndex((area) => area.id === areaId);
  if (index === -1) {
    return AreaAccentPalette[0];
  }
  return AreaAccentPalette[index % AreaAccentPalette.length];
}
