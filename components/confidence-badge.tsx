import { DesignTokens } from '@/constants/theme';
import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';

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

export const ConfidenceBadge = React.memo(function ConfidenceBadge({
  level,
  label,
  style,
}: ConfidenceBadgeProps) {
  const config = LEVEL_CONFIG[level];
  const displayLabel = label ?? config.defaultLabel;

  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: config.backgroundColor },
      style,
    ],
    [config.backgroundColor, style]
  );

  const textStyle = useMemo(
    () => [styles.text, { color: config.textColor }],
    [config.textColor]
  );

  return (
    <View
      style={containerStyle}
      accessible={true}
      accessibilityLabel={`Accuracy: ${displayLabel}`}
      accessibilityRole="text"
    >
      <ThemedText variant="caption" style={textStyle}>
        {displayLabel}
      </ThemedText>
    </View>
  );
});

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
