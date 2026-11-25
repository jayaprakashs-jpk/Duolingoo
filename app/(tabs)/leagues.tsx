import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { LEAGUES } from '@/data/league';
import { useNow } from '@/hooks/useNow';
import { DEMOTION_ZONE, PROMOTION_ZONE } from '@/lib/constants';
import { formatCountdown, weekEndMs, weekProgress } from '@/lib/date';
import { buildBoard, type BoardRow } from '@/services/league';
import { fetchLeagueRivals } from '@/services/sync';
import { useApp } from '@/store/app';

export default function Leagues() {
  const insets = useSafeAreaInsets();
  const league = useApp((s) => s.league);
  const name = useApp((s) => s.displayName);
  const userId = useApp((s) => s.userId);
  const now = useNow(1000);
  const [real, setReal] = useState<BoardRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId) void fetchLeagueRivals(league.weekId, league.tier).then(setReal);
    }, [userId, league.weekId, league.tier])
  );

  const minute = Math.floor(now / 30000);
  const board = useMemo(
    () => buildBoard(league.weekId, league.tier, league.weeklyXp, name, real, weekProgress(now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [league.weekId, league.tier, league.weeklyXp, name, real, minute]
  );
  const t = LEAGUES[league.tier];
  const top = LEAGUES.length - 1;
  const myRank = board.findIndex((r) => r.isYou) + 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 72 }}>{t.emoji}</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>{t.name} League</Text>
          <Text style={{ color: '#777', textAlign: 'center' }}>
            Top {PROMOTION_ZONE} move up{league.tier === top ? ' (you are at the top!)' : ''}. Bottom {DEMOTION_ZONE} move down.
          </Text>
          <Text style={{ color: '#FF9600', fontWeight: '900', marginTop: 4 }}>⏳ Ends in {formatCountdown(weekEndMs(new Date(now)) - now)}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }}>
          {LEAGUES.map((l, i) => (
            <View key={l.name} style={{ alignItems: 'center', marginRight: 14, opacity: i <= league.tier ? 1 : 0.35 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: i === league.tier ? l.color : '#F0F0F0', borderWidth: i === league.tier ? 3 : 0, borderColor: l.dark, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26 }}>{l.emoji}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#777', marginTop: 2 }}>{l.name}</Text>
            </View>
          ))}
        </ScrollView>

        {league.last ? (
          <Card border={league.last.outcome === 'promoted' ? '#58CC02' : '#E5E5E5'} bg={league.last.outcome === 'promoted' ? '#F0FFE0' : '#F7F7F7'} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '900', color: '#4B4B4B' }}>
              Last week: #{league.last.rank} · {league.last.outcome === 'promoted' ? `promoted to ${LEAGUES[league.last.toTier].name}` : league.last.outcome === 'demoted' ? `moved to ${LEAGUES[league.last.toTier].name}` : 'stayed'}
              {league.last.gems ? ` · +${league.last.gems} 💎` : ''}
            </Text>
          </Card>
        ) : null}

        <Text style={{ textAlign: 'center', fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>
          You are #{myRank} with {league.weeklyXp} XP
        </Text>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {board.map((r, i) => {
            const rank = i + 1;
            const promo = rank <= PROMOTION_ZONE && league.tier < top;
            const demo = rank > board.length - DEMOTION_ZONE && league.tier > 0;
            return (
              <View key={r.id}>
                {rank === 1 && promo ? <Text style={{ backgroundColor: '#E7FFD1', color: '#58A700', fontWeight: '900', fontSize: 11, letterSpacing: 1, paddingVertical: 4, textAlign: 'center' }}>▲ PROMOTION ZONE</Text> : null}
                {rank === PROMOTION_ZONE + 1 && promo === false && league.tier < top ? <Text style={{ backgroundColor: '#F5F5F5', color: '#AFAFAF', fontWeight: '900', fontSize: 11, textAlign: 'center', paddingVertical: 3 }}>— — —</Text> : null}
                {rank === board.length - DEMOTION_ZONE + 1 && demo ? <Text style={{ backgroundColor: '#FFE4E4', color: '#EA2B2B', fontWeight: '900', fontSize: 11, letterSpacing: 1, paddingVertical: 4, textAlign: 'center' }}>▼ DEMOTION ZONE</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: r.isYou ? '#DDF4FF' : '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                  <Text style={{ width: 26, fontWeight: '900', color: promo ? '#58A700' : demo ? '#EA2B2B' : '#777' }}>{rank}</Text>
                  <Text style={{ fontSize: 26 }}>{r.avatar}</Text>
                  <Text style={{ flex: 1, fontWeight: r.isYou ? '900' : '700', color: '#4B4B4B', fontSize: 16 }} numberOfLines={1}>
                    {r.isYou ? `${r.name} (you)` : r.name}
                    {r.real ? ' ✓' : ''}
                  </Text>
                  <Text style={{ fontWeight: '900', color: '#777' }}>{r.xp} XP</Text>
                </View>
              </View>
            );
          })}
        </Card>
        <Text style={{ color: '#AFAFAF', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
          Rivals marked ✓ are real learners. Others are practice bots so the board is never empty.
        </Text>
      </ScrollView>
    </View>
  );
}
