import React, { memo, useCallback } from 'react';
import { AccessibilityProps, GestureResponderEvent, Pressable, StyleSheet, ViewStyle } from 'react-native';
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

export const Card = memo(function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...accessibilityProps
}: CardProps) {
  const handlePress = useCallback((event: GestureResponderEvent) => {
    onPress?.(event);
  }, [onPress]);

  const content = (
    <ThemedView variant="surface" style={[styles.container, style]}>
      {children}
    </ThemedView>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole ?? 'button'}
        {...accessibilityProps}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

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
