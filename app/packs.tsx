import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LockedPanel } from '@/components/LockedPanel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { deletePack, listPacks, savePack } from '@/services/db';
import { hasVoice } from '@/services/speech';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

export default function Packs() {
  const course = useActiveCourse();
  const e = useEntitlements();
  const downloaded = useApp((s) => s.downloaded);
  const setDownloaded = useApp((s) => s.setDownloaded);
  const [info, setInfo] = useState<Record<string, { bytes: number }>>({});
  const [voiceOk, setVoiceOk] = useState<boolean | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    listPacks()
      .then((rows) => {
        const m: Record<string, { bytes: number }> = {};
        for (const r of rows) m[r.unitId] = { bytes: r.bytes };
        setInfo(m);
      })
      .catch(() => {});

  useEffect(() => {
    void refresh();
    void hasVoice(course.ttsLocale).then(setVoiceOk);
    void NetInfo.fetch().then((s) => setOnline(!!s.isConnected));
  }, [course.ttsLocale]);

  if (!e.offlinePacks)
    return (
      <Screen scroll>
        <ScreenHeader title="Offline packs" />
        <LockedPanel title="Offline packs are a Super perk" body="Download any unit and learn in airplane mode." feature="offline" />
      </Screen>
    );

  const dl = async (unitId: string) => {
    const unit = course.units.find((u) => u.id === unitId);
    if (!unit) return;
    setBusy(unitId);
    try {
      const r = await savePack(unit, course);
      setDownloaded(unitId, true);
      toast(`Saved ${unit.title}: ${r.audio} audio phrases indexed.`, 'success');
      await refresh();
    } catch {
      toast('Download failed. Try again.', 'warn');
    }
    setBusy(null);
  };
  const rm = async (unitId: string) => {
    await deletePack(unitId).catch(() => {});
    setDownloaded(unitId, false);
    await refresh();
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Offline packs" />
      <Text style={{ color: '#777', marginBottom: 12, lineHeight: 21 }}>
        Each pack stores the unit's lessons and an audio manifest in the on-device database. Spoken audio comes from your phone's own voices, so it works with no internet.
      </Text>
      {voiceOk === false ? (
        <Card border="#FF9600" bg="#FFF4E0" style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '800', color: '#CC7800' }}>No {course.targetName} voice found on this phone</Text>
          <Text style={{ color: '#777', marginTop: 4 }}>Open Android Settings, Text-to-speech output, and install the {course.targetName} voice data while you are online.</Text>
        </Card>
      ) : null}
      {!online ? <Text style={{ color: '#FF9600', fontWeight: '800', marginBottom: 8 }}>✈️ You are offline. Downloaded packs still work.</Text> : null}
      <View style={{ gap: 10 }}>
        {course.units.map((u) => {
          const has = !!downloaded[u.id] && !!info[u.id];
          return (
            <Card key={u.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 8, alignSelf: 'stretch', borderRadius: 4, backgroundColor: u.color }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '900', fontSize: 17, color: '#4B4B4B' }}>{u.title}</Text>
                  <Text style={{ color: '#777' }}>{has ? `✅ Offline · ${(info[u.id].bytes / 1024).toFixed(0)} KB` : `${u.lessons.length} lessons + story`}</Text>
                </View>
                {has ? <Button title="Remove" small variant="white" onPress={() => void rm(u.id)} /> : <Button title="Download" small loading={busy === u.id} onPress={() => void dl(u.id)} />}
              </View>
            </Card>
          );
        })}
      </View>
      <View style={{ height: 12 }} />
      <Button title="Download all units" variant="blue" onPress={async () => { for (const u of course.units) if (!downloaded[u.id]) await dl(u.id); }} />
    </Screen>
  );
}
