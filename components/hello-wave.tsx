import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

export const HelloWave = React.memo(function HelloWave() {
  return (
    <Animated.Text style={styles.wave}>
      👋
    </Animated.Text>
  );
});

const styles = StyleSheet.create({
  wave: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
    animationName: {
      '50%': { transform: [{ rotate: '25deg' }] },
    },
    animationIterationCount: 4,
    animationDuration: '300ms',
  },
});
