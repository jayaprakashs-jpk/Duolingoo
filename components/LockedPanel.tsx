import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export function LockedPanel({ title, body, feature, plan = 'Super' }: { title: string; body: string; feature: string; plan?: string }) {
  const router = useRouter();
  return (
    <Card border="#CE82FF" bg="#FAF3FF" className="items-center gap-2">
      <Text className="text-[44px]">🔒</Text>
      <Text className="text-xl font-black text-eel text-center">{title}</Text>
      <Text className="text-wolf text-center leading-[22px]">{body}</Text>
      <Button title={`Unlock with ${plan}`} variant="purple" onPress={() => router.push(`/paywall?feature=${feature}`)} style={{ alignSelf: 'stretch', marginTop: 6 }} />
    </Card>
  );
}
