import React, { useEffect } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/constants';
import type { ExplainSection } from '@/services/explain';
import type { Grade } from '@/services/grading';
import { Button } from './ui/Button';
import { Press } from '@/components/ui/Press';

const PRAISE = ['Great job!', 'Amazing!', 'Nice one!', 'Correct!', 'Excellent!', 'Well done!'];

interface Props {
  grade: Grade;
  seed: number;
  onContinue: () => void;
  onExplain: () => void;
  onSpeak?: () => void;
}

export function FeedbackSheet({ grade, seed, onContinue, onExplain, onSpeak }: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(260);
  useEffect(() => {
    y.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const ok = grade.correct;
  const bg = ok ? C.correctBg : C.wrongBg;
  const fg = ok ? C.correctText : C.wrongText;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: bg, padding: 16, paddingBottom: 16 + insets.bottom, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{ok ? '✅' : '❌'}</Text>
        </View>
        <Text style={{ color: fg, fontSize: 22, fontWeight: '900', flex: 1 }}>{ok ? PRAISE[seed % PRAISE.length] : 'Correct solution:'}</Text>
        {onSpeak ? (
          <Press onPress={onSpeak} accessibilityLabel="Hear the answer" style={{ padding: 6 }}>
            <Text style={{ fontSize: 22 }}>🔊</Text>
          </Press>
        ) : null}
      </View>

      {!ok || grade.almost ? (
        <Text style={{ color: fg, fontSize: 17, fontWeight: '700', marginTop: 8, lineHeight: 26 }}>{grade.correctText}</Text>
      ) : null}

      {grade.diff ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
          {grade.diff.map((d, i) => (
            <Text key={i} style={{ fontSize: 17, fontWeight: '800', color: d.ok ? C.correctText : C.wrongText, textDecorationLine: d.ok ? 'none' : 'underline' }}>
              {d.word}
            </Text>
          ))}
        </View>
      ) : null}
      {grade.message ? <Text style={{ color: fg, marginTop: 6, fontWeight: '600' }}>{grade.message}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Press onPress={onExplain} style={{ paddingVertical: 12, paddingHorizontal: 6 }} accessibilityLabel="Explain my answer">
          <Text style={{ color: fg, fontWeight: '800', letterSpacing: 0.5 }}>💡 EXPLAIN MY ANSWER</Text>
        </Press>
        <View style={{ flex: 1 }} />
        <Button title="Continue" variant={ok ? 'green' : 'red'} onPress={onContinue} style={{ minWidth: 130 }} />
      </View>
    </Animated.View>
  );
}

export function ExplainModal({ visible, sections, onClose }: { visible: boolean; sections: ExplainSection[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 18 + insets.bottom, maxHeight: '75%' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B', marginBottom: 10 }}>💡 Explain my answer</Text>
        <ScrollView>
          {sections.map((s, i) => (
            <View key={i} style={{ marginBottom: 14 }}>
              <Text style={{ fontWeight: '800', color: '#1CB0F6', marginBottom: 2 }}>{s.title}</Text>
              <Text style={{ color: '#4B4B4B', fontSize: 16, lineHeight: 24 }}>{s.body}</Text>
            </View>
          ))}
        </ScrollView>
        <Button title="Got it" onPress={onClose} variant="blue" />
      </View>
    </Modal>
  );
}
