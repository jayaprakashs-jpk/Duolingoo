import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { llmReply, aiMode, newRpState, roleplaySystemPrompt, rpStep, scoreRoleplay, type ChatMsg, type RpState } from '@/services/ai';
import { speak, stopSpeaking } from '@/services/speech';
import { cancelListening, startListening } from '@/services/stt';
import { play } from '@/services/sound';
import { useApp } from '@/store/app';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/ui';
import { Press } from '@/components/ui/Press';

interface Msg {
  who: 'you' | 'npc';
  text: string;
  tr?: string;
}

export default function Roleplay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const course = useActiveCourse();
  const ent = useEntitlements();
  const rp = course.roleplays.find((r) => r.id === decodeURIComponent(id ?? ''));
  const mode = aiMode();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const state = useRef<RpState>(newRpState());
  const history = useRef<ChatMsg[]>([]);
  const scroll = useRef<ScrollView>(null);
  const closed = useRef(false);

  useEffect(() => {
    if (!ent.aiTutor) router.replace('/paywall?feature=max');
  }, [ent.aiTutor, router]);

  const npcSay = useCallback(
    (text: string, tr?: string) => {
      setMsgs((m) => [...m, { who: 'npc', text, tr }]);
      history.current.push({ role: 'assistant', text });
      if (voice) speak(text, course.ttsLocale);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
    },
    [course.ttsLocale, voice]
  );

  useEffect(() => {
    if (rp) {
      const t = setTimeout(() => npcSay(rp.opener.text, rp.opener.tr), 300);
      return () => {
        clearTimeout(t);
        stopSpeaking();
        void cancelListening();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoGoals = useMemo(() => rp?.goals ?? [], [rp]);
  if (!rp)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Scenario not found.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setDraft('');
    setMsgs((m) => [...m, { who: 'you', text }]);
    history.current.push({ role: 'user', text });
    setBusy(true);
    const step = rpStep(rp, state.current, text);
    if (step.newGoals.length) {
      setDone([...state.current.done]);
      void play('correct');
    }
    let replyText = step.reply.text;
    let tr: string | undefined = step.reply.tr;
    if (mode !== 'offline') {
      const r = await llmReply(roleplaySystemPrompt(course, rp), history.current.slice(-12));
      if (r) {
        replyText = r;
        tr = undefined;
      }
    }
    setBusy(false);
    npcSay(replyText, tr);
    if (step.allDone && !closed.current) {
      closed.current = true;
      setTimeout(() => npcSay(rp.closing.text, rp.closing.tr), 1400);
    }
  };

  const mic = async () => {
    if (listening) {
      await cancelListening();
      setListening(false);
      return;
    }
    stopSpeaking();
    setListening(true);
    await startListening(course.sttLocale, {
      onPartial: (t) => setDraft(t),
      onFinal: (t) => {
        setListening(false);
        void send(t);
      },
      onError: (reason) => {
        setListening(false);
        toast(reason === 'permission' ? 'Microphone permission denied. Type instead.' : reason === 'unavailable' ? 'Speech recognition unavailable. Type instead.' : 'I did not catch that.', 'info');
      },
    });
  };

  const finish = () => {
    stopSpeaking();
    void cancelListening();
    const score = scoreRoleplay(rp, state.current);
    useApp.getState().addXp(state.current.userTexts.length ? score.xp : 0);
    useSessionStore.getState().setRoleplayGrade({
      roleplayId: rp.id,
      title: rp.title,
      accuracy: score.accuracy,
      fluency: score.fluency,
      goalsDone: state.current.done,
      goalsTotal: rp.goals.length,
      tips: score.tips,
      better: score.better,
      mode: mode === 'offline' ? 'offline' : 'ai',
      xp: state.current.userTexts.length ? score.xp : 0,
    });
    router.replace('/roleplay-result');
  };

  const allDone = done.length >= rp.goals.length;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#F7F7F7', paddingTop: insets.top }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: '#E5E5E5' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Press onPress={() => router.back()} hitSlop={12}>
            <Text style={{ fontSize: 26, color: '#AFAFAF', fontWeight: '800' }}>✕</Text>
          </Press>
          <Text style={{ fontSize: 30 }}>{rp.persona.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{rp.persona.name}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>{rp.persona.role} · {rp.title}</Text>
          </View>
          <Press onPress={() => setVoice((v) => !v)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 22 }}>{voice ? '🔊' : '🔇'}</Text>
          </Press>
          <Press onPress={() => setShowTr((v) => !v)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 22 }}>{showTr ? '🌐' : '🚫'}</Text>
          </Press>
        </View>
        <Text style={{ color: '#777', marginTop: 6, fontSize: 13 }}>{rp.setting}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {memoGoals.map((g) => {
            const ok = done.includes(g.id);
            return (
              <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ok ? '#D7FFB8' : '#F0F0F0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 }}>
                <Text>{ok ? '✅' : '⬜'}</Text>
                <Text style={{ color: ok ? '#58A700' : '#777', fontWeight: '800', fontSize: 12 }}>{g.text}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 14, gap: 10 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.who === 'you' ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
            <View style={{ backgroundColor: m.who === 'you' ? '#DDF4FF' : '#fff', borderColor: m.who === 'you' ? '#84D8FF' : '#E5E5E5', borderWidth: 2, borderRadius: 18, padding: 12 }}>
              <Text onPress={() => m.who === 'npc' && speak(m.text, course.ttsLocale)} style={{ fontSize: 17, fontWeight: '600', color: '#4B4B4B', lineHeight: 25 }}>
                {m.text}
              </Text>
              {showTr && m.tr ? <Text style={{ color: '#777', fontSize: 13, marginTop: 4, lineHeight: 19 }}>{m.tr}</Text> : null}
            </View>
          </View>
        ))}
        {busy ? <Text style={{ color: '#AFAFAF', marginLeft: 6 }}>{rp.persona.name} is typing…</Text> : null}
      </ScrollView>

      <View style={{ backgroundColor: '#fff', borderTopWidth: 2, borderTopColor: '#E5E5E5', paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
        {allDone ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
            <Button title="All goals done! Finish and grade" variant="gold" onPress={finish} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 10, marginBottom: 6 }}>
            {rp.hints.map((h) => (
              <Press key={h} onPress={() => setDraft(h)} style={{ backgroundColor: '#F0F9FF', borderColor: '#84D8FF', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
                <Text style={{ color: '#1899D6', fontWeight: '700' }}>{h}</Text>
              </Press>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, alignItems: 'center' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Say it in ${course.targetName}`}
            placeholderTextColor="#AFAFAF"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void send(draft)}
            style={{ flex: 1, borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, backgroundColor: '#F7F7F7', color: '#4B4B4B' }}
          />
          <Press onPress={() => void mic()} accessibilityLabel="Speak" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: listening ? '#FF4B4B' : '#1CB0F6', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{listening ? '⏹️' : '🎤'}</Text>
          </Press>
          <Press onPress={() => void send(draft)} accessibilityLabel="Send" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: draft.trim() ? '#58CC02' : '#E5E5E5', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: '#fff', fontWeight: '900' }}>➤</Text>
          </Press>
        </View>
        {!allDone ? <Press onPress={finish} style={{ padding: 8 }}><Text style={{ textAlign: 'center', color: '#AFAFAF', fontWeight: '800', fontSize: 12 }}>END AND GRADE NOW</Text></Press> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
