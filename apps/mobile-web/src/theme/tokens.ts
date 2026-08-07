import { Platform } from 'react-native';

// Converted from the approved Development OS mockup's OKLCH palette to hex,
// since React Native's style engine doesn't support oklch() on native platforms.
export const Colors = {
  bg: '#0A0B0D',
  sidebarBg: '#060708',
  surface: '#121416',
  surfaceHover: '#1A1C1F',
  border: '#2A2B2E',
  borderSubtle: '#1E1F22',
  text: '#E6E8EA',
  textSecondary: '#888C94',
  textMuted: '#54585F',
  danger: '#E5484D',
} as const;

// Palette assigned to Areas of Development in creation order. The first four
// values match the mockup's sample areas (Developer, Athlete, Writer, Piano Player).
export const AreaAccentPalette = [
  '#59AAF8',
  '#5BBD74',
  '#AC89E8',
  '#E69C3A',
  '#F76E9C',
  '#3CD8F7',
] as const;

export const Fonts = Platform.select({
  web: {
    sans: '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  ios: {
    sans: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
})!;

export const MaxContentWidth = {
  page: 760,
  form: 560,
} as const;

// Below this window width, the persistent sidebar becomes a hidden drawer.
export const Breakpoints = {
  mobile: 768,
} as const;
