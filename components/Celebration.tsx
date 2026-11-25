import React, { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const EMOJI = ['🎉', '⭐', '✨', '💚', '🔥', '💎', '🎊'];

function Piece({ i, emoji }: { i: number; emoji: string }) {
  const { width, height } = Dimensions.get('window');
  const y = useSharedValue(-40);
  const r = useSharedValue(0);
  const x = useMemo(() => ((i * 53) % 100) / 100 * (width - 30), [i, width]);
  useEffect(() => {
    y.value = withDelay((i % 8) * 120, withTiming(height + 40, { duration: 2600 + (i % 5) * 250, easing: Easing.in(Easing.quad) }));
    r.value = withDelay((i % 8) * 120, withTiming(360 * (i % 2 ? 1 : -1), { duration: 2800 }));
  }, [i, height, y, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }] }));
  return <Animated.Text style={[{ position: 'absolute', left: x, top: 0, fontSize: 24 }, style]}>{emoji}</Animated.Text>;
}

/** falling emoji confetti, non-interactive */
export function Celebration({ count = 24 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 50 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} i={i} emoji={EMOJI[i % EMOJI.length]} />
      ))}
    </View>
  );
}
