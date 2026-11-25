import React, { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/** Shakes on a wrong answer, does a little bounce on a correct one. `trigger.n` changes on every check. */
export function FeedbackAnim({ trigger, children }: { trigger: { n: number; ok: boolean }; children: ReactNode }) {
  const x = useSharedValue(0);
  const s = useSharedValue(1);
  useEffect(() => {
    if (trigger.n === 0) return;
    if (trigger.ok) {
      s.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 160 }));
    } else {
      x.value = withSequence(withTiming(-10, { duration: 60 }), withRepeat(withTiming(10, { duration: 110 }), 5, true), withTiming(0, { duration: 60 }));
    }
  }, [trigger.n, trigger.ok, x, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
