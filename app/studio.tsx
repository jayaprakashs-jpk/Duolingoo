import React, { useState } from 'react';
import { Share, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { courseExerciseCount } from '@/data/builder';
import { IMPORT_TEMPLATE, parseCourseJson } from '@/services/validate';
import { useCatalog } from '@/store/catalog';
import { toast } from '@/store/ui';

export default function Studio() {
  const catalog = useCatalog();
  const active = useActiveCourse();
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const check = (): ReturnType<typeof parseCourseJson> => {
    const r = parseCourseJson(text);
    setErrors(r.errors);
    setSummary(r.course ? `Valid: ${r.course.title} · ${r.course.units.length} units · ${courseExerciseCount(r.course)} exercises` : null);
    return r;
  };

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const body = await (await fetch(res.assets[0].uri)).text();
      setText(body);
      setErrors([]);
      setSummary(null);
      toast(`Loaded ${res.assets[0].name}`, 'success');
    } catch {
      toast('Could not read that file', 'warn');
    }
  };

  const importIt = async () => {
    const r = check();
    if (!r.course) return;
    await catalog.add(r.course);
    toast(`Imported ${r.course.title}`, 'success');
    setText('');
    setSummary(null);
  };

  const custom = catalog.courses.filter((c) => !c.builtin);

  return (
    <Screen scroll>
      <ScreenHeader title="Curriculum Studio" />
      <Text style={{ color: '#777', lineHeight: 22, marginBottom: 10 }}>
        Add a new language without rebuilding the APK. Paste course JSON or pick a .json file. Use the compact format (vocab, sentences, one fill-blank and one dialogue per lesson) and LinguaSpark generates 11 exercises per lesson for you.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button title="Template" small variant="white" style={{ flex: 1 }} onPress={() => { setText(IMPORT_TEMPLATE); setErrors([]); setSummary(null); }} />
        <Button title="Pick file" small variant="blue" style={{ flex: 1 }} onPress={() => void pick()} />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder='{ "id": "fr-for-en", "title": "French for English Speakers", ... }'
        placeholderTextColor="#AFAFAF"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ minHeight: 220, maxHeight: 360, borderWidth: 2, borderColor: errors.length ? '#FF4B4B' : '#E5E5E5', borderRadius: 14, padding: 12, fontSize: 12, backgroundColor: '#F7F7F7', color: '#4B4B4B', fontFamily: 'monospace', textAlignVertical: 'top' }}
      />
      {errors.length ? (
        <Card border="#FF4B4B" bg="#FFF0F0" style={{ marginTop: 10 }}>
          {errors.slice(0, 8).map((e, i) => (
            <Text key={i} style={{ color: '#EA2B2B', fontSize: 13, marginBottom: 2 }}>• {e}</Text>
          ))}
          {errors.length > 8 ? <Text style={{ color: '#EA2B2B' }}>…and {errors.length - 8} more</Text> : null}
        </Card>
      ) : null}
      {summary ? <Text style={{ color: '#58A700', fontWeight: '800', marginTop: 10 }}>✅ {summary}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Button title="Validate" variant="white" style={{ flex: 1 }} disabled={!text.trim()} onPress={() => void check()} />
        <Button title="Import" style={{ flex: 1 }} disabled={!text.trim()} onPress={() => void importIt()} />
      </View>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 22, marginBottom: 8 }}>Imported courses</Text>
      {!custom.length ? <Text style={{ color: '#777' }}>None yet.</Text> : null}
      {custom.map((c) => (
        <Card key={c.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 30 }}>{c.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: '#4B4B4B' }}>{c.title}</Text>
              <Text style={{ color: '#777', fontSize: 13 }}>{c.units.length} units · {courseExerciseCount(c)} exercises</Text>
            </View>
            <Button title="Delete" small variant="white" onPress={() => void catalog.remove(c.id)} />
          </View>
        </Card>
      ))}

      <Button title={`Export "${active.title}" JSON`} variant="white" style={{ marginTop: 14 }} onPress={() => void Share.share({ message: JSON.stringify(active, null, 2) })} />
    </Screen>
  );
}
