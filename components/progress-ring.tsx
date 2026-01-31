import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { DesignTokens } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ProgressRingSize = 'large' | 'small';

export interface ProgressRingProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Confidence value from 0 to 1 for secondary ring */
  confidence?: number;
  /** Size variant */
  size?: ProgressRingSize;
  /** Whether to animate the progress */
  animated?: boolean;
  /** Custom value to display inside (defaults to percentage) */
  displayValue?: string;
  /** Custom label below the value */
  label?: string;
  /** Custom styles */
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  large: {
    width: 200,
    height: 200,
    strokeWidth: 12,
    fontSize: 'display' as const,
    labelSize: 'body' as const,
  },
  small: {
    width: 80,
    height: 80,
    strokeWidth: 6,
    fontSize: 'h2' as const,
    labelSize: 'caption' as const,
  },
};

export function ProgressRing({
  progress,
  confidence = 0,
  size = 'large',
  animated = true,
  displayValue,
  label,
  style,
}: ProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const center = config.width / 2;
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp values between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const clampedConfidence = Math.max(0, Math.min(1, confidence));

  // Animation values
  const progressValue = useSharedValue(0);
  const confidenceValue = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(clampedProgress, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      confidenceValue.value = withTiming(clampedConfidence, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progressValue.value = clampedProgress;
      confidenceValue.value = clampedConfidence;
    }
  }, [clampedProgress, clampedConfidence, animated]);

  // Animated props for progress arc
  const progressAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      progressValue.value,
      [0, 1],
      [circumference, 0]
    );
    return {
      strokeDashoffset,
    };
  });

  // Animated props for confidence arc
  const confidenceAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      confidenceValue.value,
      [0, 1],
      [circumference, 0]
    );
    return {
      strokeDashoffset,
    };
  });

  // Calculate display text
  const percentageText = displayValue ?? `${Math.round(clampedProgress * 100)}%`;

  return (
    <View
      style={[styles.container, { width: config.width, height: config.height }, style]}
      accessible={true}
      accessibilityLabel={`${label || 'Progress'}: ${percentageText}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
      }}
    >
      <Svg width={config.width} height={config.height} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={DesignTokens.border}
          strokeWidth={config.strokeWidth}
          fill="transparent"
        />

        {/* Confidence ring (secondary) */}
        {clampedConfidence > 0 && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={DesignTokens.accent}
            strokeWidth={config.strokeWidth * 0.6}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            // @ts-ignore - animatedProps is valid for AnimatedCircle
            animatedProps={confidenceAnimatedProps}
            transform={`rotate(-90, ${center}, ${center})`}
            opacity={0.5}
          />
        )}

        {/* Progress arc (primary) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={DesignTokens.primary}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          // @ts-ignore - animatedProps is valid for AnimatedCircle
          animatedProps={progressAnimatedProps}
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <ThemedText variant={config.fontSize} color="primary">
          {percentageText}
        </ThemedText>
        {label && (
          <ThemedText variant={config.labelSize} color="secondary">
            {label}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
