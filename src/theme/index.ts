import type { Theme } from '@react-navigation/native'

// Hex equivalents mirror tailwind.config.js so JS-only consumers
// (React Navigation theme, FlatList styles, gradient props) match the
// same Signal-inspired palette.
export const colors = {
  background: '#161a26',
  foreground: '#f0f2f7',

  surface: '#1f2433',
  surface2: '#262c3d',
  surfaceHover: '#2f3649',

  primary: '#4a78ff',
  primaryHover: '#3a68ef',
  primaryForeground: '#ffffff',

  mutedForeground: '#9aa0b0',

  destructive: '#e35454',
  warning: '#e0b647',
  success: '#3fc97c',

  bubbleOwn: '#4f7bff',
  bubblePeer: '#262c3d',

  border: '#2a3142',
  borderStrong: '#384057',
} as const

export const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.foreground,
    border: colors.border,
    notification: colors.destructive,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
}
