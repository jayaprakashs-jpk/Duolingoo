import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface Props {
  emoji: string;
  color: string;
  speaking: boolean;
  listening?: boolean;
  size?: number;
}

/** animated call avatar: halo pulses while the tutor talks, ring glows while the learner is being heard */
export function Avatar({ emoji, color, speaking, listening, size = 190 }: Props) {
  const halo = useSharedValue(0);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (speaking || listening) {
      halo.value = withRepeat(withTiming(1, { duration: speaking ? 700 : 1100, easing: Easing.out(Easing.quad) }), -1);
      bob.value = withRepeat(withTiming(1, { duration: 380 }), -1, true);
    } else {
      halo.value = withTiming(0, { duration: 200 });
      bob.value = withTiming(0, { duration: 200 });
    }
  }, [speaking, listening, halo, bob]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - halo.value), transform: [{ scale: 1 + halo.value * 0.45 }] }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * bob.value * (speaking ? 1 : 0.3) }, { scale: 1 + 0.03 * bob.value }] }));
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: listening ? '#58CC02' : color }, haloStyle]} />
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: listening ? '#58CC02' : 'rgba(255,255,255,0.25)' },
          faceStyle,
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}
