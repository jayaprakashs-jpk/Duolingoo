import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useApp } from '@/store/app';
import { useCatalog } from '@/store/catalog';

export default function Courses() {
  const router = useRouter();
  const courses = useCatalog((s) => s.courses);
  const active = useApp((s) => s.courseId);
  const progress = useApp((s) => s.progress);
  const setCourse = useApp((s) => s.setCourse);
  return (
    <Screen scroll>
      <ScreenHeader title="My courses" />
      <View className="gap-3">
        {courses.map((c) => {
          const total = c.units.reduce((n, u) => n + u.lessons.length, 0);
          const done = Object.keys(progress[c.id]?.completed ?? {}).filter((id) => c.units.some((u) => u.lessons.some((l) => l.id === id))).length;
          return (
            <Card
              key={c.id}
              border={active === c.id ? '#84D8FF' : '#E5E5E5'}
              bg={active === c.id ? '#DDF4FF' : '#fff'}
              onPress={() => {
                setCourse(c.id, c.nativeLang, c.targetLang);
                router.replace('/(tabs)/learn');
              }}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-[40px]">{c.flag}</Text>
                <View className="flex-1 gap-1.5">
                  <Text className="text-lg font-black text-eel">{c.title}</Text>
                  <ProgressBar value={total ? done / total : 0} height={10} />
                  <Text className="text-[13px] text-wolf">
                    {done}/{total} lessons{c.builtin ? '' : ' · imported'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
        <Button title="Add a course (Curriculum Studio)" variant="white" onPress={() => router.push('/studio')} />
      </View>
    </Screen>
  );
}
