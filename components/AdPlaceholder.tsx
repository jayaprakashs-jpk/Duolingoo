import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Card } from './ui/Card';

/** Free-tier banner placeholder. Hidden for every paid tier. Swap for a real ad SDK component when you monetize. */
export function AdBanner() {
  const e = useEntitlements();
  const router = useRouter();
  if (e.noAds) return null;
  return (
    <Card onPress={() => router.push('/paywall')} bg="#F7F7F7" className="my-3">
      <View className="flex-row items-center gap-3">
        <View className="rounded-md bg-swan px-1.5 py-0.5">
          <Text className="text-[11px] font-extrabold text-wolf">AD</Text>
        </View>
        <View className="flex-1">
          <Text className="font-extrabold text-eel">Your ad could be here</Text>
          <Text className="text-[13px] text-wolf">Go Super to remove all ads</Text>
        </View>
      </View>
    </Card>
  );
}
