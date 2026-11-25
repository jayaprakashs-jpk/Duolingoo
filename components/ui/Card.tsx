import React, { type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  border?: string;
  bg?: string;
}

/** white card with the chunky bottom edge used throughout the app (NativeWind layout, dynamic colors inline) */
export function Card({ children, onPress, style, className = '', border = '#E5E5E5', bg = '#FFFFFF' }: Props) {
  const colors: ViewStyle = { backgroundColor: bg, borderColor: border };
  if (onPress)
    return (
      <Pressable onPress={onPress} className={`rounded-[18px] border-2 border-b-4 p-3.5 active:border-b-2 active:mt-0.5 ${className}`} style={[colors, style as ViewStyle]}>
        {children}
      </Pressable>
    );
  return (
    <View className={`rounded-[18px] border-2 border-b-4 p-3.5 ${className}`} style={[colors, style]}>
      {children}
    </View>
  );
}
