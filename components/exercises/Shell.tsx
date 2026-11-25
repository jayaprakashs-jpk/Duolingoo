import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3.5">
      <Text className="text-2xl font-black text-eel leading-8">{title}</Text>
      {children}
    </View>
  );
}

export function Bubble({ text, sub, who = 'A', onPress }: { text: string; sub?: string; who?: 'A' | 'B'; onPress?: () => void }) {
  const mine = who === 'B';
  return (
    <View className={`max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
      <View className={`rounded-[18px] border-2 p-3 ${mine ? 'bg-[#DDF4FF] border-[#84D8FF]' : 'bg-white border-swan'}`}>
        <Text onPress={onPress} className="text-lg font-semibold text-eel leading-[27px]">
          {text}
        </Text>
        {sub ? <Text className="mt-1 text-sm text-wolf">{sub}</Text> : null}
      </View>
    </View>
  );
}
