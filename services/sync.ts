// Offline-first sync. Every change is written locally first and queued in SQLite.
// When we are online AND signed in, the queue is flushed to Supabase. Guest mode never touches the network.
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { useApp } from '@/store/app';
import { deleteQueued, enqueue, peekQueue, queueSize, type QueuedEvent } from './db';
import { supabase } from './supabase';
import type { BoardRow } from './league';

export interface FlushResult {
  sent: number;
  failed: number;
  pending: number;
  skipped?: 'guest' | 'offline' | 'no-backend';
}

let flushing = false;

export function queueMistake(userId: string, courseId: string, lessonId: string, exerciseId: string): void {
  void enqueue('mistake', { user_id: userId, course_id: courseId, lesson_id: lessonId, exercise_id: exerciseId, logged_at: new Date().toISOString() }, `mistake:${exerciseId}`).catch(() => {});
}

async function sendEvent(e: QueuedEvent): Promise<boolean> {
  if (!supabase) return false;
  const p = e.payload as Record<string, unknown>;
  const now = new Date().toISOString();
  try {
    switch (e.kind) {
      case 'profile': {
        const { error } = await supabase.from('profiles').upsert(
          {
            id: p.user_id, display_name: p.display_name, xp: p.xp, gems: p.gems, streak: p.streak, best_streak: p.best_streak,
            daily_goal: p.daily_goal, course_id: p.course_id, native_lang: p.native_lang, target_lang: p.target_lang,
            league_tier: p.league_tier, updated_at: now,
          },
          { onConflict: 'id' }
        );
        if (error) return false;
        const { error: e2 } = await supabase.from('league_members').upsert(
          { user_id: p.user_id, week_id: p.week_id, tier: p.league_tier, weekly_xp: p.weekly_xp, display_name: p.display_name, updated_at: now },
          { onConflict: 'user_id,week_id' }
        );
        return !e2;
      }
      case 'progress': {
        const { error } = await supabase.from('user_progress').upsert(
          { user_id: p.user_id, course_id: p.course_id, lesson_id: p.lesson_id, completions: p.completions, best_accuracy: p.best_accuracy, completed_at: p.completed_at },
          { onConflict: 'user_id,course_id,lesson_id' }
        );
        return !error;
      }
      case 'mistake': {
        const { error } = await supabase.from('mistakes_bank').upsert(
          { user_id: p.user_id, course_id: p.course_id, lesson_id: p.lesson_id, exercise_id: p.exercise_id, logged_at: p.logged_at },
          { onConflict: 'user_id,exercise_id' }
        );
        return !error;
      }
      case 'entitlement':
        return true; // legacy events are dropped: entitlements are server-written only
      default:
        return true; // unknown kinds are dropped
    }
  } catch {
    return false;
  }
}

export async function flushQueue(): Promise<FlushResult> {
  const user = useApp.getState().userId;
  if (!supabase) return { sent: 0, failed: 0, pending: await queueSize(), skipped: 'no-backend' };
  if (!user) return { sent: 0, failed: 0, pending: await queueSize(), skipped: 'guest' };
  const net = await NetInfo.fetch();
  if (!net.isConnected || net.isInternetReachable === false) return { sent: 0, failed: 0, pending: await queueSize(), skipped: 'offline' };
  if (flushing) return { sent: 0, failed: 0, pending: await queueSize() };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const events = await peekQueue(200);
    const ok: number[] = [];
    for (const e of events) {
      if (await sendEvent(e)) {
        ok.push(e.id);
        sent++;
      } else failed++;
    }
    await deleteQueued(ok);
  } finally {
    flushing = false;
  }
  return { sent, failed, pending: await queueSize() };
}

/** Pull the cloud copy and merge it into the local one (union of completed lessons, max of XP/streak). */
export async function pullRemote(): Promise<void> {
  const s = useApp.getState();
  if (!supabase || !s.userId) return;
  try {
    const [{ data: profile }, { data: progress }, { data: ent }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.userId).maybeSingle(),
      supabase.from('user_progress').select('course_id, lesson_id, completions, best_accuracy').eq('user_id', s.userId),
      supabase.from('subscription_entitlements').select('tier, expires_at').eq('user_id', s.userId).maybeSingle(),
    ]);
    if (profile) {
      useApp.setState((st) => ({
        xp: Math.max(st.xp, Number(profile.xp ?? 0)),
        gems: Math.max(st.gems, Number(profile.gems ?? 0)),
        streak: { ...st.streak, best: Math.max(st.streak.best, Number(profile.best_streak ?? 0)) },
        displayName: st.displayName === 'Learner' && profile.display_name ? String(profile.display_name) : st.displayName,
      }));
    }
    // a real, unexpired server entitlement upgrades a free local tier (it never downgrades the simulator)
    if (ent && (!ent.expires_at || new Date(ent.expires_at as string).getTime() > Date.now()) && useApp.getState().tier === 'free') {
      const t = ent.tier as 'super' | 'family' | 'max';
      if (t === 'super' || t === 'family' || t === 'max') useApp.getState().setTier(t);
    }
    if (progress && progress.length) {
      const byCourse: Record<string, string[]> = {};
      for (const r of progress as { course_id: string; lesson_id: string }[]) (byCourse[r.course_id] ??= []).push(r.lesson_id);
      for (const [cid, ids] of Object.entries(byCourse)) useApp.getState().markLessonsComplete(cid, ids);
    }
  } catch {
    /* offline or backend not ready: local data stays the source of truth */
  }
}

export async function fetchLeagueRivals(weekId: string, tier: number): Promise<BoardRow[]> {
  const s = useApp.getState();
  if (!supabase || !s.userId) return [];
  try {
    const { data, error } = await supabase
      .from('league_members')
      .select('user_id, display_name, weekly_xp')
      .eq('week_id', weekId)
      .eq('tier', tier)
      .neq('user_id', s.userId)
      .order('weekly_xp', { ascending: false })
      .limit(29);
    if (error || !data) return [];
    return (data as { user_id: string; display_name: string; weekly_xp: number }[]).map((r) => ({
      id: r.user_id,
      name: r.display_name || 'Learner',
      avatar: '🧑',
      xp: r.weekly_xp,
      real: true,
    }));
  } catch {
    return [];
  }
}

/** Flush on reconnect, on app foreground and once at start. Returns an unsubscribe function. */
export function startSync(): () => void {
  const sub = NetInfo.addEventListener((st) => {
    if (st.isConnected) void flushQueue();
  });
  const app = AppState.addEventListener('change', (st) => {
    if (st === 'active') void flushQueue();
  });
  void flushQueue();
  return () => {
    sub();
    app.remove();
  };
}
