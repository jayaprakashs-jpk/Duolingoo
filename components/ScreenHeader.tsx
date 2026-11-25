import React, { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export function ScreenHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-2 pb-3">
      <Pressable onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/learn')))} hitSlop={12} accessibilityLabel="Back" className="p-1.5">
        <Text className="text-[26px] font-extrabold text-hare">‹</Text>
      </Pressable>
      <Text className="flex-1 text-[22px] font-black text-eel" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
