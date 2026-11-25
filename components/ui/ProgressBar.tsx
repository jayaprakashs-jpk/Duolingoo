import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface Props {
  value: number; // 0..1
  color?: string;
  track?: string;
  height?: number;
}

export function ProgressBar({ value, color = '#58CC02', track = '#E5E5E5', height = 16 }: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 450 });
  }, [value, p]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: height / 2 }, style]}>
        <View style={{ position: 'absolute', left: 8, right: 8, top: 3, height: Math.max(3, height / 5), borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </Animated.View>
    </View>
  );
}
