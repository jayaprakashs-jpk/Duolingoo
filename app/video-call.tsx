import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useNow } from '@/hooks/useNow';
import { aiLabel, aiMode, callSystemPrompt, findFixes, llmReply, ruleCallReply, vocabUsed, type CallEngineState, type ChatMsg } from '@/services/ai';
import { speak, stopSpeaking } from '@/services/speech';
import { cancelListening, startListening, sttAvailable } from '@/services/stt';
import { useApp } from '@/store/app';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/ui';

interface Line {
  who: 'you' | 'tutor';
  text: string;
  n?: string;
}

function Ctl({ icon, label, onPress, active, danger, big }: { icon: string; label: string; onPress: () => void; active?: boolean; danger?: boolean; big?: boolean }) {
  const size = big ? 66 : 50;
  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <Pressable onPress={onPress} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: danger ? '#FF4B4B' : active ? '#58CC02' : 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: big ? 30 : 22 }}>{icon}</Text>
      </Pressable>
      <Text numberOfLines={1} style={{ color: '#C9C3E0', fontSize: 10, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function VideoCall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const course = useActiveCourse();
  const ent = useEntitlements();
  const kit = course.tutor;
  const persona = course.persona;
  const mode = aiMode();

  const [lines, setLines] = useState<Line[]>([]);
  const [current, setCurrent] = useState<Line | null>(null);
  const [subs, setSubs] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [partial, setPartial] = useState('');
  const [sttOk, setSttOk] = useState<boolean | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const started = useRef(Date.now());
  const engine = useRef<CallEngineState>({ turn: 0, counts: {} });
  const corrections = useRef<{ said: string; hint: string; better: string }[]>([]);
  const history = useRef<ChatMsg[]>([]);
  const ended = useRef(false);
  const now = useNow(1000);

  useEffect(() => {
    if (!ent.aiTutor) router.replace('/paywall?feature=max');
  }, [ent.aiTutor, router]);

  const tutorSay = useCallback(
    (l: { t: string; n?: string }) => {
      const line: Line = { who: 'tutor', text: l.t, n: l.n };
      setLines((p) => [...p, line]);
      setCurrent(line);
      history.current.push({ role: 'assistant', text: l.t });
      speak(l.t, course.ttsLocale, { onStart: () => setSpeaking(true), onDone: () => setSpeaking(false) });
    },
    [course.ttsLocale]
  );

  useEffect(() => {
    void sttAvailable().then((ok) => {
      setSttOk(ok);
      if (!ok) setTyping(true);
    });
    const t = setTimeout(() => tutorSay(kit.openers[0]), 900);
    return () => {
      clearTimeout(t);
      stopSpeaking();
      void cancelListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUser = useCallback(
    async (text: string) => {
      const said = text.trim();
      if (!said || ended.current) return;
      const ul: Line = { who: 'you', text: said };
      setLines((p) => [...p, ul]);
      setCurrent(ul);
      history.current.push({ role: 'user', text: said });
      for (const f of findFixes(kit, said)) corrections.current.push({ said, hint: f.hint, better: f.better });
      setThinking(true);
      let reply: { t: string; n?: string } | null = null;
      if (mode !== 'offline') {
        const r = await llmReply(callSystemPrompt(course), history.current.slice(-12));
        if (r) reply = { t: r };
      }
      if (!reply) {
        const { line } = ruleCallReply(kit, said, engine.current);
        reply = line;
      }
      engine.current.turn += 1;
      setThinking(false);
      if (!ended.current) tutorSay(reply);
    },
    [course, kit, mode, tutorSay]
  );

  const mic = async () => {
    if (listening) {
      await cancelListening();
      setListening(false);
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    setPartial('');
    setListening(true);
    await startListening(course.sttLocale, {
      onPartial: (t) => setPartial(t),
      onFinal: (t) => {
        setListening(false);
        setPartial('');
        void onUser(t);
      },
      onError: (reason) => {
        setListening(false);
        setPartial('');
        if (reason === 'permission') toast('Microphone permission denied. Use the keyboard instead.', 'warn');
        else if (reason === 'unavailable') {
          toast('Speech recognition is not available. Use the keyboard.', 'warn');
          setTyping(true);
        } else if (reason === 'no-speech') toast('I did not hear anything. Try again.', 'info');
      },
    });
  };

  const end = () => {
    if (ended.current) return;
    ended.current = true;
    stopSpeaking();
    void cancelListening();
    const userTexts = lines.filter((l) => l.who === 'you').map((l) => l.text);
    const turns = userTexts.length;
    const seconds = Math.round((Date.now() - started.current) / 1000);
    useSessionStore.getState().setCallSummary({
      courseId: course.id,
      persona: persona.name,
      seconds,
      turns,
      vocab: vocabUsed(course, userTexts),
      corrections: corrections.current,
      mode: mode === 'offline' ? 'offline' : 'ai',
      transcript: lines.map((l) => ({ who: l.who, text: l.text })),
    });
    if (turns >= 2) useApp.getState().addXp(10 + Math.min(15, turns * 2));
    router.replace('/call-summary');
  };

  const elapsed = Math.floor((now - started.current) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#14121F', paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 }}>
        <View>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{persona.name}</Text>
          <Text style={{ color: '#8F88AB', fontSize: 12 }}>{persona.role} · {aiLabel(mode)}</Text>
        </View>
        <Text style={{ color: '#58CC02', fontWeight: '900' }}>● {mm}:{ss}</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar emoji={persona.emoji} color={persona.color} speaking={speaking} listening={listening} />
        <Text style={{ color: '#C9C3E0', marginTop: 4, fontWeight: '700' }}>{thinking ? `${persona.name} is thinking…` : listening ? 'Listening…' : speaking ? `${persona.name} is speaking` : 'Your turn'}</Text>
        <View style={{ position: 'absolute', right: 14, top: 4, width: 84, height: 112, borderRadius: 14, backgroundColor: '#262038', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: listening ? '#58CC02' : '#3A3354' }}>
          <Text style={{ fontSize: 40 }}>😀</Text>
          <Text style={{ color: '#8F88AB', fontSize: 11 }}>You</Text>
        </View>
      </View>

      {subs ? (
        <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: 12, minHeight: 84 }}>
          <ScrollView style={{ maxHeight: 120 }}>
            {partial ? <Text style={{ color: '#9BE564', fontSize: 17, fontStyle: 'italic' }}>{partial}</Text> : null}
            {current ? (
              <>
                <Text style={{ color: current.who === 'you' ? '#84D8FF' : '#fff', fontSize: 18, fontWeight: '700', lineHeight: 26 }}>
                  {current.who === 'you' ? 'You: ' : `${persona.name}: `}
                  {current.text}
                </Text>
                {showTr && current.n ? <Text style={{ color: '#C9C3E0', fontSize: 14, marginTop: 4, lineHeight: 21 }}>{current.n}</Text> : null}
              </>
            ) : (
              <Text style={{ color: '#8F88AB' }}>Connecting…</Text>
            )}
          </ScrollView>
        </View>
      ) : null}

      {typing ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Type in ${course.targetName}`}
            placeholderTextColor="#8F88AB"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => {
              void onUser(draft);
              setDraft('');
            }}
            style={{ flex: 1, backgroundColor: '#262038', color: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 }}
          />
          <Pressable
            onPress={() => {
              void onUser(draft);
              setDraft('');
            }}
            style={{ backgroundColor: '#58CC02', borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>SEND</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6, paddingBottom: 14 + insets.bottom, paddingTop: 6 }}>
        <Ctl icon="💬" label="Subtitles" active={subs} onPress={() => setSubs((v) => !v)} />
        <Ctl icon={listening ? '⏹️' : '🎤'} label={sttOk === false ? 'No mic' : listening ? 'Stop' : 'Talk'} big active={listening} onPress={() => void mic()} />
        <Ctl icon="⌨️" label="Keyboard" active={typing} onPress={() => setTyping((v) => !v)} />
        <Ctl icon="🌐" label="Translate" active={showTr} onPress={() => setShowTr((v) => !v)} />
        <Ctl icon="📞" label="End" danger onPress={end} />
      </View>
    </KeyboardAvoidingView>
  );
}
