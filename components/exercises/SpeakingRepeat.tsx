import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { SpeakingRepeatEx } from '@/data/types';
import { SpeakerPair } from '@/components/SpeakerButton';
import { useCourseCtx } from '@/components/CourseContext';
import { cancelListening, startListening, sttAvailable } from '@/services/stt';
import { Shell } from './Shell';
import type { ExProps } from './types';
import { Press } from '@/components/ui/Press';

type Phase = 'idle' | 'listening' | 'got' | 'typing';

export function SpeakingRepeat({ ex, onAnswer, locked, grade, onSkipSpeaking }: ExProps<SpeakingRepeatEx>) {
  const course = useCourseCtx();
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [note, setNote] = useState('');
  const [canSpeak, setCanSpeak] = useState<boolean | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    void sttAvailable().then((ok) => {
      if (!alive.current) return;
      setCanSpeak(ok);
      if (!ok) {
        setPhase('typing');
        setNote('Speech recognition is not available on this device, so type what you would say.');
      }
    });
    return () => {
      alive.current = false;
      void cancelListening();
    };
  }, []);

  const listen = async () => {
    setNote('');
    setHeard('');
    setPhase('listening');
    await startListening(course.sttLocale, {
      onPartial: (t) => alive.current && setHeard(t),
      onFinal: (t) => {
        if (!alive.current) return;
        setHeard(t);
        setPhase('got');
        onAnswer(t);
      },
      onError: (reason) => {
        if (!alive.current) return;
        if (reason === 'permission') {
          setNote('Microphone permission was denied. Type your answer instead.');
          setPhase('typing');
        } else if (reason === 'unavailable') {
          setNote('Speech recognition is not available. Type your answer instead.');
          setPhase('typing');
        } else {
          setNote('I did not catch that. Tap the mic and try again.');
          setPhase('idle');
        }
      },
    });
  };

  const busy = phase === 'listening';
  return (
    <Shell title="Say this sentence">
      <View style={{ alignItems: 'center', gap: 12 }}>
        <SpeakerPair text={ex.phrase} lang={course.ttsLocale} />
        <View style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 14, alignSelf: 'stretch' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#4B4B4B', lineHeight: 32, textAlign: 'center' }}>{ex.phrase}</Text>
          <Text style={{ color: '#777', textAlign: 'center', marginTop: 4, fontSize: 15 }}>{ex.translation}</Text>
        </View>
      </View>

      {phase === 'typing' ? (
        <TextInput
          editable={!locked}
          value={heard}
          onChangeText={(t) => {
            setHeard(t);
            onAnswer(t.trim() ? t : null);
          }}
          placeholder="Type what you would say"
          placeholderTextColor="#AFAFAF"
          autoCorrect={false}
          autoCapitalize="none"
          style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 14, fontSize: 19, backgroundColor: '#F7F7F7', color: '#4B4B4B' }}
        />
      ) : (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Press
            disabled={locked || busy || canSpeak === null}
            onPress={listen}
            accessibilityLabel="Start speaking"
            style={({ pressed }) => ({
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: busy ? '#FF4B4B' : '#1CB0F6',
              borderBottomWidth: pressed ? 2 : 6,
              borderBottomColor: busy ? '#EA2B2B' : '#1899D6',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text style={{ fontSize: 40 }}>{busy ? '👂' : '🎤'}</Text>
          </Press>
          <Text style={{ color: '#777', fontWeight: '600' }}>{busy ? 'Listening...' : phase === 'got' ? 'Tap the mic to try again' : 'Tap the mic and say it'}</Text>
          {heard ? <Text style={{ fontSize: 18, color: '#4B4B4B', fontStyle: 'italic', textAlign: 'center' }}>“{heard}”</Text> : null}
        </View>
      )}

      {note ? <Text style={{ color: '#FF9600', fontWeight: '600', textAlign: 'center' }}>{note}</Text> : null}

      {!locked ? (
        <Press onPress={onSkipSpeaking} style={{ alignSelf: 'center', padding: 10 }} accessibilityLabel="Can't speak now">
          <Text style={{ color: '#1CB0F6', fontWeight: '800', letterSpacing: 0.6 }}>CAN'T SPEAK NOW</Text>
          <Text style={{ color: '#AFAFAF', fontSize: 12, textAlign: 'center' }}>skips speaking for 15 minutes</Text>
        </Press>
      ) : null}
      {grade && grade.accuracy !== undefined ? <Text style={{ textAlign: 'center', color: '#777' }}>Accuracy {Math.round(grade.accuracy * 100)}%</Text> : null}
    </Shell>
  );
}
