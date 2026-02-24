import { DesignTokens } from '@/constants/theme';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from './themed-text';

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

const ProgressRingComponent = ({
  progress,
  confidence = 0,
  size = 'large',
  animated = true,
  displayValue,
  label,
  style,
}: ProgressRingProps) => {
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
  }, [clampedProgress, clampedConfidence, animated, progressValue, confidenceValue]);

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

  // Memoize the container style to avoid recalculation
  const containerStyle = useMemo(
    () => [styles.container, { width: config.width, height: config.height }, style],
    [config.width, config.height, style]
  );

  // Memoize the SVG props
  const svgProps = useMemo(
    () => ({ width: config.width, height: config.height }),
    [config.width, config.height]
  );

  // Memoize transform for both circles
  const circleTransform = useMemo(
    () => `rotate(-90, ${center}, ${center})`,
    [center]
  );

  return (
    <View
      style={containerStyle}
      accessible={true}
      accessibilityLabel={`${label || 'Progress'}: ${percentageText}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
      }}
    >
      <Svg {...svgProps} style={styles.svg}>
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
        {clampedConfidence > 0 ? (
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
            transform={circleTransform}
            opacity={0.5}
          />
        ) : null}

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
          transform={circleTransform}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <ThemedText variant={config.fontSize} color="primary">
          {percentageText}
        </ThemedText>
        {label ? (
          <ThemedText variant={config.labelSize} color="secondary">
            {label}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ProgressRing = React.memo(ProgressRingComponent);

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
