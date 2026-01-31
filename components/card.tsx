import React from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, GestureResponderEvent, AccessibilityProps } from 'react-native';
import { ThemedView } from './themed-view';

export interface CardProps extends AccessibilityProps {
  /** Card content */
  children: React.ReactNode;
  /** Custom styles */
  style?: ViewStyle;
  /** Press handler (makes card clickable) */
  onPress?: (event: GestureResponderEvent) => void;
  /** Accessibility label for the card */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...accessibilityProps
}: CardProps) {
  const content = (
    <ThemedView variant="surface" style={[styles.container, style]}>
      {children}
    </ThemedView>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole ?? 'button'}
        {...accessibilityProps}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16, // 16dp radius as per spec
    padding: 16, // 16dp padding as per spec
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4, // Android shadow
  },
});
