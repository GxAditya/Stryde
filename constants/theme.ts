/**
 * Design System Colors for Stryde Fitness Tracking App
 * Dark mode is the default theme
 */

import { Platform } from 'react-native';

// Design System Color Tokens
export const DesignTokens = {
  // Primary Colors
  primary: '#13ec6d',
  primaryDark: '#0da84d', // Darker shade of primary

  // Accent Colors - WCAG AA compliant
  accent: '#15803D', // Darker green
  warning: '#D97706', // Darker amber
  error: '#B91C1C', // Darker red

  // Background & Surface
  background: '#102218',
  surface: '#1A3324', // Slightly lighter than background
  border: '#2A4A35', // Border color matching theme

  // Text Colors
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Theme Colors for React Native
export const Colors = {
  light: {
    text: DesignTokens.textPrimary,
    background: DesignTokens.background,
    tint: DesignTokens.primary,
    icon: DesignTokens.textSecondary,
    tabIconDefault: DesignTokens.textSecondary,
    tabIconSelected: DesignTokens.primary,
    surface: DesignTokens.surface,
    border: DesignTokens.border,
    primary: DesignTokens.primary,
    primaryDark: DesignTokens.primaryDark,
    accent: DesignTokens.accent,
    warning: DesignTokens.warning,
    error: DesignTokens.error,
    textPrimary: DesignTokens.textPrimary,
    textSecondary: DesignTokens.textSecondary,
    white: DesignTokens.white,
    black: DesignTokens.black,
  },
  dark: {
    text: DesignTokens.textPrimary,
    background: DesignTokens.background,
    tint: DesignTokens.primary,
    icon: DesignTokens.textSecondary,
    tabIconDefault: DesignTokens.textSecondary,
    tabIconSelected: DesignTokens.primary,
    surface: DesignTokens.surface,
    border: DesignTokens.border,
    primary: DesignTokens.primary,
    primaryDark: DesignTokens.primaryDark,
    accent: DesignTokens.accent,
    warning: DesignTokens.warning,
    error: DesignTokens.error,
    textPrimary: DesignTokens.textPrimary,
    textSecondary: DesignTokens.textSecondary,
    white: DesignTokens.white,
    black: DesignTokens.black,
  },
};

// Typography Fonts
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Typography Scale
export const Typography = {
  display: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  micro: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
  },
};
