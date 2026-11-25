import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/** the flame breathes slowly when lit and is grey when the streak is cold */
export function StreakFlame({ size = 22, lit = true }: { size?: number; lit?: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (!lit) {
      s.value = 1;
      return;
    }
    s.value = withRepeat(withSequence(withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1);
  }, [lit, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.Text style={[{ fontSize: size, opacity: lit ? 1 : 0.35 }, style]}>🔥</Animated.Text>;
}
