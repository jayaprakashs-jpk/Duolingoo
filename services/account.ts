import { useApp } from '@/store/app';
import { enqueue } from './db';
import { flushQueue, pullRemote } from './sync';
import { supabase } from './supabase';

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsConfirm?: boolean;
}

async function afterLogin(userId: string, email: string | null, name?: string) {
  useApp.getState().setUser(userId, email, name);
  const s = useApp.getState();
  // push everything we already have locally, then merge in the cloud copy
  await enqueue('profile', {
    user_id: userId, display_name: s.displayName, xp: s.xp, gems: s.gems, streak: s.streak.count, best_streak: s.streak.best,
    daily_goal: s.dailyGoal, course_id: s.courseId, native_lang: s.nativeLang, target_lang: s.targetLang,
    league_tier: s.league.tier, weekly_xp: s.league.weeklyXp, week_id: s.league.weekId,
  }, 'profile').catch(() => {});
  for (const [courseId, cp] of Object.entries(s.progress)) {
    for (const [lessonId, lp] of Object.entries(cp.completed)) {
      await enqueue('progress', { user_id: userId, course_id: courseId, lesson_id: lessonId, completions: lp.count, best_accuracy: lp.best, completed_at: new Date(lp.last).toISOString() }, `progress:${courseId}:${lessonId}`).catch(() => {});
    }
  }
  await pullRemote();
  void flushQueue();
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured. You are in Guest Mode.' };
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (error) return { ok: false, error: error.message };
  if (!data.session) return { ok: true, needsConfirm: true };
  await afterLogin(data.user!.id, data.user!.email ?? email, name);
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured. You are in Guest Mode.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign in failed' };
  await afterLogin(data.user.id, data.user.email ?? email);
  return { ok: true };
}

export async function signOutAccount(): Promise<void> {
  try {
    await supabase?.auth.signOut();
  } catch {
    /* ignore */
  }
  useApp.getState().setUser(null, null);
}

/** Called at startup: if a saved session exists, mark the user as signed in. */
export async function restoreSession(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (u) {
      useApp.getState().setUser(u.id, u.email ?? null);
      void pullRemote().then(() => flushQueue());
    }
  } catch {
    /* offline: keep whatever the store already has */
  }
}
