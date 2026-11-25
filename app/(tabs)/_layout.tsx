import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntitlements } from '@/hooks/useEntitlements';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size + 2} color={color} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const e = useEntitlements();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1CB0F6',
        tabBarInactiveTintColor: '#AFAFAF',
        tabBarLabelStyle: { fontWeight: '800', fontSize: 11 },
        tabBarStyle: { height: 68 + insets.bottom, paddingBottom: insets.bottom + 8, paddingTop: 6, borderTopWidth: 2, borderTopColor: '#E5E5E5' },
      }}
    >
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: icon('barbell'),
          tabBarLabel: ({ color }) => <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{e.practiceHub ? 'Practice' : 'Practice 🔒'}</Text>,
        }}
      />
      <Tabs.Screen name="leagues" options={{ title: 'Leagues', tabBarIcon: icon('shield') }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
