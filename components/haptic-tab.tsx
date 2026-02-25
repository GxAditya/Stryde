import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  const handlePressIn = useCallback(
    (ev: Parameters<NonNullable<BottomTabBarButtonProps['onPressIn']>>[0]) => {
      if (process.env.EXPO_OS === 'ios') {
        // Add a soft haptic feedback when pressing down on the tabs.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      props.onPressIn?.(ev);
    },
    [props.onPressIn]
  );

  return (
    <PlatformPressable
      {...props}
      accessibilityRole="tab"
      onPressIn={handlePressIn}
    />
  );
}
