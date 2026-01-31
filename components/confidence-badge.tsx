import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { DesignTokens } from '@/constants/theme';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceBadgeProps {
  /** Confidence level determining the color */
  level: ConfidenceLevel;
  /** Optional custom label (defaults to level name) */
  label?: string;
  /** Custom styles */
  style?: ViewStyle;
}

const LEVEL_CONFIG: Record<
  ConfidenceLevel,
  { backgroundColor: string; textColor: string; defaultLabel: string }
> = {
  high: {
    backgroundColor: DesignTokens.accent, // Green #22C55E
    textColor: DesignTokens.white,
    defaultLabel: 'High Accuracy',
  },
  medium: {
    backgroundColor: DesignTokens.warning, // Yellow #F59E0B
    textColor: DesignTokens.black,
    defaultLabel: 'Medium Accuracy',
  },
  low: {
    backgroundColor: DesignTokens.error, // Red #EF4444
    textColor: DesignTokens.white,
    defaultLabel: 'Low Accuracy',
  },
};

export function ConfidenceBadge({
  level,
  label,
  style,
}: ConfidenceBadgeProps) {
  const config = LEVEL_CONFIG[level];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
      accessible={true}
      accessibilityLabel={`Accuracy: ${displayLabel}`}
      accessibilityRole="text"
    >
      <ThemedText
        variant="caption"
        style={[styles.text, { color: config.textColor }]}
      >
        {displayLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16, // Pill shape
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
