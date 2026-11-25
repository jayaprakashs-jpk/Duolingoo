import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '@/components/AdPlaceholder';
import { Celebration } from '@/components/Celebration';
import { PathNode, type NodeState } from '@/components/PathNode';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import type { Unit } from '@/data/types';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useHearts } from '@/hooks/useHearts';
import { PRICES } from '@/lib/constants';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { Press } from '@/components/ui/Press';

const OFFSETS = [0, 46, 78, 46, 0, -46, -78, -46];

interface NodeSpec {
  key: string;
  icon: string;
  label: string;
  state: NodeState;
  side?: boolean;
  badge?: string;
  onPress: () => void;
}

export default function Learn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const course = useActiveCourse();
  const progress = useApp((s) => s.progress[course.id]);
  const downloaded = useApp((s) => s.downloaded);
  const spendGems = useApp((s) => s.spendGems);
  const repair = useApp((s) => s.streak.repairCelebrate);
  const streakCount = useApp((s) => s.streak.count);
  const clearRepair = useApp((s) => s.clearRepairCelebration);
  const e = useEntitlements();
  const hearts = useHearts();
  const [showRepair, setShowRepair] = useState(false);

  useEffect(() => {
    if (repair) setShowRepair(true);
  }, [repair]);

  const done = useMemo(() => new Set(Object.keys(progress?.completed ?? {})), [progress]);
  const legendary = progress?.legendary ?? {};

  const startLesson = (id: string, kind: 'lesson' | 'story' | 'timed') => {
    if (kind === 'lesson' && hearts.empty) {
      router.push('/hearts');
      return;
    }
    router.push(`/session?kind=${kind}&id=${encodeURIComponent(id)}`);
  };

  const unitUnlocked = (ui: number) => ui === 0 || course.units[ui - 1].lessons.every((l) => done.has(l.id));

  const nodesFor = (u: Unit, ui: number): NodeSpec[] => {
    const unlocked = unitUnlocked(ui);
    const allDone = u.lessons.every((l) => done.has(l.id));
    const isLeg = !!legendary[u.id];
    let activeTaken = false;
    const lessonNode = (li: number): NodeSpec => {
      const l = u.lessons[li];
      const canPlay = unlocked && (li === 0 || done.has(u.lessons[li - 1].id));
      let state: NodeState = 'locked';
      if (done.has(l.id)) state = isLeg ? 'legendary' : 'completed';
      else if (canPlay && !activeTaken) {
        state = 'active';
        activeTaken = true;
      } else if (canPlay) state = 'active';
      return {
        key: l.id,
        icon: l.icon,
        label: l.title,
        state,
        onPress: () => (canPlay || done.has(l.id) ? startLesson(l.id, 'lesson') : toast('Finish the previous lesson first.', 'info')),
      };
    };
    const story: NodeSpec = {
      key: u.story.id,
      icon: '📖',
      label: 'Story',
      side: true,
      state: done.has(u.story.id) ? 'completed' : unlocked && done.has(u.lessons[Math.min(2, u.lessons.length - 1)].id) ? 'active' : 'locked',
      onPress: () => (unlocked && done.has(u.lessons[Math.min(2, u.lessons.length - 1)].id) ? startLesson(u.story.id, 'story') : toast('Finish lesson 3 to unlock this story.', 'info')),
    };
    const timed: NodeSpec = {
      key: u.timed.id,
      icon: '⚡',
      label: u.timed.title,
      side: true,
      state: done.has(u.timed.id) ? 'completed' : allDone ? 'active' : 'locked',
      onPress: () => (allDone ? startLesson(u.timed.id, 'timed') : toast('Finish all lessons in the unit to unlock.', 'info')),
    };
    const roleplays: NodeSpec[] = u.roleplayIds.map((rid) => {
      const rp = course.roleplays.find((r) => r.id === rid);
      return {
        key: rid,
        icon: rp?.emoji ?? '🎭',
        label: rp?.title.split(' ').slice(0, 2).join(' ') ?? 'Roleplay',
        side: true,
        badge: 'MAX',
        state: allDone ? ('active' as NodeState) : ('locked' as NodeState),
        onPress: () => {
          if (!allDone) return toast('Finish all lessons in the unit to unlock roleplays.', 'info');
          if (!e.aiTutor) return router.push('/paywall?feature=max');
          router.push(`/roleplay?id=${encodeURIComponent(rid)}`);
        },
      };
    });
    const leg: NodeSpec = {
      key: `${u.id}.legendary`,
      icon: '👑',
      label: 'Legendary',
      side: true,
      state: isLeg ? 'legendary' : allDone ? 'active' : 'locked',
      onPress: () => {
        if (!allDone) return toast('Finish every lesson in the unit to unlock Legendary.', 'info');
        const go = () => router.push(`/session?kind=legendary&id=${encodeURIComponent(u.id)}`);
        if (e.freeLegendary) return go();
        Alert.alert('Legendary challenge', `Free plan: each attempt costs ${PRICES.legendaryAttempt} gems. Super has unlimited free attempts.`, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Super', onPress: () => router.push('/paywall?feature=legendary') },
          {
            text: `Pay ${PRICES.legendaryAttempt} gems`,
            onPress: () => {
              if (spendGems(PRICES.legendaryAttempt)) go();
              else toast('Not enough gems. Earn more from quests and lessons.', 'warn');
            },
          },
        ]);
      },
    };
    return [lessonNode(0), lessonNode(1), lessonNode(2), story, lessonNode(3), lessonNode(4), timed, ...roleplays, leg];
  };

  let lastSection = '';
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {course.units.map((u, ui) => {
          const unlocked = unitUnlocked(ui);
          const showSection = u.section !== lastSection;
          lastSection = u.section;
          const nodes = nodesFor(u, ui);
          return (
            <View key={u.id}>
              {showSection ? (
                <Text style={{ textAlign: 'center', color: '#AFAFAF', fontWeight: '900', letterSpacing: 1.2, marginTop: 18, marginBottom: 4, fontSize: 12 }}>{u.section.toUpperCase()}</Text>
              ) : null}
              <View style={{ marginHorizontal: 14, marginTop: 8, backgroundColor: unlocked ? u.color : '#E5E5E5', borderRadius: 18, padding: 14, borderBottomWidth: 5, borderBottomColor: unlocked ? u.dark : '#CFCFCF' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: unlocked ? 'rgba(255,255,255,0.85)' : '#999', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>UNIT {ui + 1}</Text>
                    <Text style={{ color: unlocked ? '#fff' : '#777', fontWeight: '900', fontSize: 21 }}>{u.title}</Text>
                    <Text style={{ color: unlocked ? 'rgba(255,255,255,0.9)' : '#999', fontSize: 14 }}>{u.subtitle}</Text>
                  </View>
                  <Press
                    onPress={() => router.push(`/guidebook?unit=${encodeURIComponent(u.id)}`)}
                    accessibilityLabel="Open guidebook"
                    style={({ pressed }) => ({ backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 10, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={{ fontSize: 22 }}>📖</Text>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>GUIDEBOOK</Text>
                  </Press>
                </View>
                {downloaded[u.id] ? <Text style={{ color: '#fff', marginTop: 6, fontWeight: '800', fontSize: 12 }}>⬇ Available offline</Text> : null}
                {!unlocked ? (
                  <View style={{ marginTop: 10 }}>
                    <Button title="Jump here?" variant="white" small onPress={() => router.push(`/session?kind=jump&id=${encodeURIComponent(u.id)}`)} />
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                {nodes.map((n, i) => (
                  <View key={n.key} style={{ marginLeft: OFFSETS[i % OFFSETS.length] * 2, marginVertical: 4 }}>
                    <PathNode icon={n.icon} label={n.label} state={n.state} color={u.color} dark={u.dark} side={n.side} badge={n.badge} onPress={n.onPress} />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <View style={{ paddingHorizontal: 16 }}>
          <AdBanner />
        </View>
      </ScrollView>

      <Modal visible={showRepair} transparent animationType="fade" onRequestClose={() => setShowRepair(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <Celebration />
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 64 }}>🔥</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#FF9600', textAlign: 'center' }}>Streak repaired!</Text>
            <Text style={{ color: '#4B4B4B', textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
              You missed a day, so your Super plan automatically restored your {streakCount} day streak. Available once a month.
            </Text>
            <Button
              title="Keep going"
              onPress={() => {
                setShowRepair(false);
                clearRepair();
              }}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
