import React, { type ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  bg?: string;
  /** apply the bottom inset (use false when a tab bar sits below) */
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Screen({ children, scroll = false, bg = '#FFFFFF', bottomInset = true, contentStyle, padded = true }: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top, paddingBottom: bottomInset ? insets.bottom : 0, backgroundColor: bg };
  if (scroll)
    return (
      <View className="flex-1" style={pad}>
        <ScrollView contentContainerClassName={padded ? 'p-4 pb-8' : 'pb-8'} contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    );
  return (
    <View className={`flex-1 ${padded ? 'p-4' : ''}`} style={[pad, contentStyle]}>
      {children}
    </View>
  );
}
