import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressStyle = StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

interface Props extends Omit<PressableProps, 'style'> {
  style?: PressStyle;
}

/**
 * Drop-in replacement for Pressable that accepts the usual `style={({ pressed }) => ...}` form.
 *
 * WHY THIS EXISTS: NativeWind v4 wraps every Pressable, and on Android it mangles a style *function*
 * (it ends up inside a style array, which React Native ignores). Every background, border and padding
 * set that way silently disappears, so white-on-green buttons became white-on-white. Here we track the
 * pressed state ourselves and always pass a plain style object. Never import Pressable from
 * 'react-native' in app code (scripts/check-no-style-functions.ts enforces this).
 */
export function Press({ style, onPressIn, onPressOut, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={resolved}
    />
  );
}
