import '../global.css';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toasts } from '@/components/Toasts';
import { restoreSession } from '@/services/account';
import { configureFeedback, initAudio } from '@/services/sound';
import { startSync } from '@/services/sync';
import { fetchRemoteCourses } from '@/services/remote';
import { useApp } from '@/store/app';
import { useCatalog } from '@/store/catalog';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useApp((s) => s.hydrated);
  const ready = useCatalog((s) => s.ready);
  const sound = useApp((s) => s.settings.sound);
  const haptics = useApp((s) => s.settings.haptics);

  useEffect(() => {
    void useCatalog.getState().load();
    void initAudio();
    void restoreSession();
    void fetchRemoteCourses().then((cs) => cs.length && useCatalog.getState().mergeRemote(cs));
    const stop = startSync();
    return stop;
  }, []);

  useEffect(() => {
    configureFeedback({ sound, haptics });
  }, [sound, haptics]);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const s = useApp.getState();
      s.syncHearts();
      s.refreshStreak();
      s.leagueTick();
    };
    tick();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && tick());
    return () => sub.remove();
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && ready) void SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, ready]);

  if (!hydrated || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="session" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="complete" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="hearts" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="video-call" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack>
        <Toasts />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
