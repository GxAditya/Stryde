/**
 * Accessibility Utilities for Stryde
 * 
 * Provides helper functions and constants for accessibility features
 * including screen reader support, contrast checking, and voice prompts.
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Announce a message to screen readers
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Preferred reduced motion setting
 */
export async function prefersReducedMotion(): Promise<boolean> {
  // @ts-ignore - isReduceMotionEnabled exists but types may be outdated
  return AccessibilityInfo.isReduceMotionEnabled?.() ?? false;
}

/**
 * Accessibility labels for common UI elements
 */
export const AccessibilityLabels = {
  // Navigation
  homeTab: 'Home tab',
  activityTab: 'Activity tracking tab',
  mapsTab: 'Maps and routes tab',
  goalsTab: 'Fitness goals tab',
  insightsTab: 'Insights and statistics tab',
  settingsTab: 'Settings tab',

  // Actions
  startActivity: 'Start activity tracking',
  pauseActivity: 'Pause activity',
  resumeActivity: 'Resume activity',
  stopActivity: 'Stop and save activity',
  deleteActivity: 'Delete activity',
  shareActivity: 'Share activity',

  // Goals
  addGoal: 'Add new goal',
  editGoal: 'Edit goal',
  deleteGoal: 'Delete goal',
  goalProgress: (current: number, target: number, unit: string) =>
    `Goal progress: ${current} of ${target} ${unit}`,

  // Hydration
  addWater: (amount: number) => `Add ${amount} milliliters of water`,
  hydrationProgress: (current: number, goal: number) =>
    `Hydration: ${current} of ${goal} milliliters`,

  // Weather
  weatherCard: 'Weather forecast',
  refreshWeather: 'Refresh weather data',

  // Stats
  totalSteps: (steps: number) => `Total steps: ${steps.toLocaleString()}`,
  totalDistance: (distance: string) => `Total distance: ${distance}`,
  totalDuration: (duration: string) => `Total duration: ${duration}`,
  caloriesBurned: (calories: number) => `Calories burned: ${calories}`,

  // Calibration
  startCalibration: 'Start calibration',
  calibrationComplete: 'Calibration complete',

  // General
  backButton: 'Go back',
  closeButton: 'Close',
  saveButton: 'Save',
  cancelButton: 'Cancel',
  deleteButton: 'Delete',
  editButton: 'Edit',
  shareButton: 'Share',
  refreshButton: 'Refresh',
  loading: 'Loading',
  error: 'Error occurred',
  retry: 'Try again',
} as const;

/**
 * Accessibility roles for custom components
 */
export const AccessibilityRoles = {
  button: 'button',
  link: 'link',
  search: 'search',
  image: 'image',
  keyboardkey: 'keyboardkey',
  text: 'text',
  adjustable: 'adjustable',
  imagebutton: 'imagebutton',
  header: 'header',
  summary: 'summary',
  alert: 'alert',
  checkbox: 'checkbox',
  combobox: 'combobox',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  progressbar: 'progressbar',
  radio: 'radio',
  radiogroup: 'radiogroup',
  scrollbar: 'scrollbar',
  spinbutton: 'spinbutton',
  switch: 'switch',
  tab: 'tab',
  tablist: 'tablist',
  timer: 'timer',
  toolbar: 'toolbar',
  list: 'list',
  listitem: 'listitem',
  grid: 'grid',
  separator: 'separator',
} as const;

/**
 * WCAG AA contrast ratio requirements
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 */
export const WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (!ratio) return false;

  const threshold = isLargeText ? WCAG_CONTRAST.AA_LARGE : WCAG_CONTRAST.AA_NORMAL;
  return ratio >= threshold;
}

/**
 * Voice prompt messages for activity tracking
 */
export const VoicePrompts = {
  activityStarted: 'Activity started. Have a great workout!',
  activityPaused: 'Activity paused.',
  activityResumed: 'Activity resumed.',
  activityCompleted: (distance: string, duration: string) =>
    `Activity complete. You covered ${distance} in ${duration}.`,
  milestoneReached: (milestone: string) => `Great job! You've reached ${milestone}.`,
  hydrationReminder: 'Time to hydrate. Take a moment to drink some water.',
  goalAchieved: (goalName: string) => `Congratulations! You've achieved your ${goalName} goal.`,
} as const;

/**
 * Battery-aware accessibility settings
 */
export interface BatteryAwareSettings {
  reduceAnimations: boolean;
  reduceGPSAccuracy: boolean;
  disableWeatherAutoRefresh: boolean;
  extendSyncInterval: boolean;
}

/**
 * Get battery-aware settings based on battery level
 */
export function getBatteryAwareSettings(batteryLevel: number): BatteryAwareSettings {
  // Low battery (< 20%)
  if (batteryLevel < 0.2) {
    return {
      reduceAnimations: true,
      reduceGPSAccuracy: true,
      disableWeatherAutoRefresh: true,
      extendSyncInterval: true,
    };
  }

  // Medium battery (20-50%)
  if (batteryLevel < 0.5) {
    return {
      reduceAnimations: true,
      reduceGPSAccuracy: false,
      disableWeatherAutoRefresh: true,
      extendSyncInterval: false,
    };
  }

  // Good battery (> 50%)
  return {
    reduceAnimations: false,
    reduceGPSAccuracy: false,
    disableWeatherAutoRefresh: false,
    extendSyncInterval: false,
  };
}

/**
 * Large text scaling factors
 */
export const TextScaling = {
  default: 1,
  large: 1.15,
  extraLarge: 1.3,
} as const;

/**
 * Minimum touch target sizes (WCAG 2.5.5)
 */
export const TouchTargets = {
  minimum: 44, // 44x44 points minimum
  recommended: 48, // 48x48 points recommended
} as const;
