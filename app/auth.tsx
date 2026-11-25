import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { signIn, signUp } from '@/services/account';
import { isSupabaseConfigured } from '@/services/supabase';
import { toast } from '@/store/ui';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const input = { borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 14, padding: 14, fontSize: 17, backgroundColor: '#F7F7F7', color: '#4B4B4B' } as const;

  const go = async () => {
    setBusy(true);
    setMsg('');
    const r = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim() || 'Learner');
    setBusy(false);
    if (!r.ok) return setMsg(r.error ?? 'Something went wrong');
    if (r.needsConfirm) return setMsg('Check your email to confirm your account, then sign in.');
    toast('Signed in. Syncing your progress.', 'success');
    router.replace('/(tabs)/learn');
  };

  return (
    <Screen scroll>
      <ScreenHeader title={mode === 'in' ? 'Sign in' : 'Create account'} />
      {!isSupabaseConfigured ? (
        <Card border="#FF9600" bg="#FFF4E0" style={{ marginBottom: 14 }}>
          <Text style={{ fontWeight: '900', color: '#CC7800' }}>Guest Mode is on</Text>
          <Text style={{ color: '#777', marginTop: 4, lineHeight: 21 }}>
            Supabase keys were not set when this APK was built, so accounts and cloud sync are off. Everything else works. See the README to add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </Text>
        </Card>
      ) : null}
      <View style={{ gap: 12 }}>
        {mode === 'up' ? <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#AFAFAF" style={input} /> : null}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#AFAFAF" autoCapitalize="none" keyboardType="email-address" style={input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password (6+ characters)" placeholderTextColor="#AFAFAF" secureTextEntry autoCapitalize="none" style={input} />
        {msg ? <Text style={{ color: '#EA2B2B', fontWeight: '700' }}>{msg}</Text> : null}
        <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={go} loading={busy} disabled={!isSupabaseConfigured || !email || password.length < 6} />
        <Button title={mode === 'in' ? 'New here? Create an account' : 'I already have an account'} variant="white" onPress={() => setMode(mode === 'in' ? 'up' : 'in')} />
        <Button title="Continue as guest" variant="white" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/learn'))} />
      </View>
    </Screen>
  );
}
