import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHearts } from '@/hooks/useHearts';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useApp } from '@/store/app';
import { dayKey } from '@/lib/date';
import { StreakFlame } from './StreakFlame';

export function TopBar() {
  const router = useRouter();
  const course = useActiveCourse();
  const streak = useApp((s) => s.streak);
  const gems = useApp((s) => s.gems);
  const dayXp = useApp((s) => s.dayXp[dayKey()] ?? 0);
  const goal = useApp((s) => s.dailyGoal);
  const h = useHearts();
  const lit = dayXp >= goal || streak.lastGoalDay === dayKey();
  const chip = 'flex-row items-center gap-1 px-2 py-1.5';
  return (
    <View className="flex-row items-center justify-between px-3 py-1.5">
      <Pressable onPress={() => router.push('/courses')} className={chip} accessibilityLabel="Switch course">
        <Text className="text-[26px]">{course.flag}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/streak')} className={chip} accessibilityLabel="Streak">
        <StreakFlame lit={lit} />
        <Text className={`text-[17px] font-extrabold ${lit ? "text-fox" : "text-hare"}`}>{streak.count}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/shop')} className={chip} accessibilityLabel="Shop">
        <Text style={{ fontSize: 20 }}>💎</Text>
        <Text style={{ fontWeight: '800', fontSize: 17, color: '#1CB0F6' }}>{gems}</Text>
      </Pressable>
      <Pressable onPress={() => router.push(h.unlimited ? '/settings' : '/hearts')} className={chip} accessibilityLabel="Hearts">
        <Text style={{ fontSize: 20 }}>{h.unlimited ? '💖' : '❤️'}</Text>
        <Text style={{ fontWeight: '800', fontSize: 17, color: '#FF4B4B' }}>{h.unlimited ? '∞' : h.hearts}</Text>
      </Pressable>
    </View>
  );
}
