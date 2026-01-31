import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
  AccessibilityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './themed-text';
import { DesignTokens } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends AccessibilityProps {
  /** Button variant determining the style */
  variant?: ButtonVariant;
  /** Button title text */
  title: string;
  /** Press handler */
  onPress?: (event: GestureResponderEvent) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom container styles */
  style?: ViewStyle;
  /** Custom text styles */
  textStyle?: TextStyle;
}

const VARIANT_CONFIG: Record<
  ButtonVariant,
  { backgroundColor: string; textColor: string; borderColor?: string }
> = {
  primary: {
    backgroundColor: DesignTokens.primary, // #2563EB
    textColor: DesignTokens.white,
  },
  secondary: {
    backgroundColor: DesignTokens.surface, // #111827
    textColor: DesignTokens.primary,
    borderColor: DesignTokens.primary,
  },
  danger: {
    backgroundColor: DesignTokens.error, // #EF4444
    textColor: DesignTokens.white,
  },
};

export function Button({
  variant = 'primary',
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  ...accessibilityProps
}: ButtonProps) {
  const config = VARIANT_CONFIG[variant];

  const handlePress = (event: GestureResponderEvent) => {
    // Provide haptic feedback on press
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          borderWidth: config.borderColor ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...accessibilityState }}
      {...accessibilityProps}
    >
      <ThemedText
        variant="bodyBold"
        style={[styles.text, { color: config.textColor }, textStyle]}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52, // 52dp height as per spec
    borderRadius: 14, // 14dp radius as per spec
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    textAlign: 'center',
  },
});
