// The one persisted store: profile, progress, economy, hearts, streak, quests, league, subscription, family.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tier } from '@/data/types';
import { LEAGUES } from '@/data/league';
import { HEART_REGEN_MS, MAX_HEARTS, PRICES, STREAK_MILESTONES, CANT_SPEAK_MS } from '@/lib/constants';
import { addDays, dayKey, daysBetween, monthKey, weekId, weekEndMs } from '@/lib/date';
import { enqueue } from '@/services/db';
import { entitlementsFor } from '@/services/billing';
import { buildBoard, gemsForRank } from '@/services/league';
import { emptyDaily, questsForDay, friendQuest, type DailyStats, type StatKey } from '@/services/quests';
import { toast } from './ui';

export interface LessonProgress {
  count: number;
  best: number;
  last: number;
}

export interface CourseProgress {
  completed: Record<string, LessonProgress>;
  legendary: Record<string, boolean>;
  placed?: boolean;
}

export type GoalDayKind = 'goal' | 'freeze' | 'repair';

export interface StreakState {
  count: number;
  best: number;
  lastGoalDay: string | null;
  freezes: number;
  goalDays: Record<string, GoalDayKind>;
  milestones: number[];
  lost: { count: number; day: string } | null;
  repairMonth: string | null;
  /** timestamp set when an automatic repair just happened, so the UI can celebrate once */
  repairCelebrate: number | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  xp: number;
  active: boolean;
  simulated: boolean;
}

export interface LeagueState {
  tier: number;
  weekId: string;
  weeklyXp: number;
  last: { rank: number; outcome: 'promoted' | 'demoted' | 'stayed'; fromTier: number; toTier: number; gems: number } | null;
}

export interface Wager {
  start: string;
  stake: number;
  days: number;
  lastDay: string | null;
}

export interface Inventory {
  xpBoostUntil: number;
  timerBoosts: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  showTranslations: boolean;
}

export type ShopItem = 'streakFreeze' | 'heartRefill' | 'wager' | 'timerBoost' | 'xpBoost';

interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  displayName: string;
  userId: string | null;
  email: string | null;
  nativeLang: string;
  targetLang: string;
  courseId: string;
  dailyGoal: number;
  progress: Record<string, CourseProgress>;
  xp: number;
  gems: number;
  hearts: number;
  heartsAt: number;
  streak: StreakState;
  dayXp: Record<string, number>;
  daily: DailyStats;
  monthly: { month: string; lessons: number };
  tier: Tier;
  family: { code: string; members: FamilyMember[] } | null;
  inventory: Inventory;
  wager: Wager | null;
  cantSpeakUntil: number;
  league: LeagueState;
  friendClaimedWeek: string | null;
  savedStories: string[];
  downloaded: Record<string, boolean>;
  settings: Settings;

  // actions
  completeOnboarding: (p: { name: string; nativeLang: string; targetLang: string; courseId: string; dailyGoal: number }) => void;
  setCourse: (courseId: string, nativeLang: string, targetLang: string) => void;
  setDailyGoal: (xp: number) => void;
  setName: (name: string) => void;
  setUser: (userId: string | null, email: string | null, name?: string) => void;
  setTier: (tier: Tier) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;

  addXp: (base: number) => number;
  addGems: (n: number) => void;
  spendGems: (n: number) => boolean;

  syncHearts: () => void;
  loseHeart: () => void;
  addHeart: (n?: number) => void;
  refillHearts: () => void;

  refreshStreak: () => void;
  buyItem: (item: ShopItem) => { ok: boolean; reason?: string };

  bumpStats: (patch: Partial<Record<StatKey, number>>) => void;
  claimQuest: (questId: string) => boolean;
  claimFriendQuest: () => boolean;
  leagueTick: () => void;

  finishLesson: (p: { courseId: string; lessonId: string; accuracy: number; countsAsLesson: boolean }) => { streakExtended: boolean };
  markLessonsComplete: (courseId: string, lessonIds: string[]) => void;
  setLegendary: (courseId: string, unitId: string) => void;
  toggleSavedStory: (id: string) => void;
  setDownloaded: (unitId: string, v: boolean) => void;
  setCantSpeak: () => void;

  ensureFamily: () => void;
  upsertFamilyMember: (m: FamilyMember) => void;
  removeFamilyMember: (id: string) => void;
  toggleFamilyMember: (id: string) => void;

  clearRepairCelebration: () => void;
  resetAll: () => void;
}

const initialStreak: StreakState = {
  count: 0,
  best: 0,
  lastGoalDay: null,
  freezes: 0,
  goalDays: {},
  milestones: [],
  lost: null,
  repairMonth: null,
  repairCelebrate: null,
};

const today = () => dayKey();

const initialData = () => ({
  hydrated: true,
  onboarded: false,
  displayName: 'Learner',
  userId: null as string | null,
  email: null as string | null,
  nativeLang: 'ta',
  targetLang: 'en',
  courseId: 'en-for-ta',
  dailyGoal: 20,
  progress: {} as Record<string, CourseProgress>,
  xp: 0,
  gems: 100,
  hearts: MAX_HEARTS,
  heartsAt: Date.now(),
  streak: initialStreak,
  dayXp: {} as Record<string, number>,
  daily: emptyDaily(today()),
  monthly: { month: monthKey(), lessons: 0 },
  tier: 'free' as Tier,
  family: null as AppState['family'],
  inventory: { xpBoostUntil: 0, timerBoosts: 0 },
  wager: null as Wager | null,
  cantSpeakUntil: 0,
  league: { tier: 0, weekId: weekId(), weeklyXp: 0, last: null } as LeagueState,
  friendClaimedWeek: null as string | null,
  savedStories: [] as string[],
  downloaded: {} as Record<string, boolean>,
  settings: { sound: true, haptics: true, showTranslations: true } as Settings,
});

function pruneDayXp(m: Record<string, number>): Record<string, number> {
  const keys = Object.keys(m).sort();
  if (keys.length <= 150) return m;
  const out: Record<string, number> = {};
  for (const k of keys.slice(-120)) out[k] = m[k];
  return out;
}

function queueProfile(s: AppState) {
  if (!s.userId) return;
  void enqueue(
    'profile',
    {
      user_id: s.userId,
      display_name: s.displayName,
      xp: s.xp,
      gems: s.gems,
      streak: s.streak.count,
      best_streak: s.streak.best,
      daily_goal: s.dailyGoal,
      course_id: s.courseId,
      native_lang: s.nativeLang,
      target_lang: s.targetLang,
      league_tier: s.league.tier,
      weekly_xp: s.league.weeklyXp,
      week_id: s.league.weekId,
    },
    'profile'
  ).catch(() => {});
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,

      completeOnboarding: ({ name, nativeLang, targetLang, courseId, dailyGoal }) => {
        set({ onboarded: true, displayName: name || 'Learner', nativeLang, targetLang, courseId, dailyGoal });
        queueProfile(get());
      },
      setCourse: (courseId, nativeLang, targetLang) => set({ courseId, nativeLang, targetLang }),
      setDailyGoal: (dailyGoal) => {
        set({ dailyGoal });
        queueProfile(get());
      },
      setName: (displayName) => {
        set({ displayName });
        queueProfile(get());
      },
      setUser: (userId, email, name) => set((s) => ({ userId, email, displayName: name ?? s.displayName })),
      // Local only. Real entitlements are written server-side (RevenueCat webhook) and never by the client.
      setTier: (tier) => set({ tier }),
      setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),

      // ------------------------------------------------------------ XP / gems
      addXp: (base) => {
        get().refreshStreak();
        const s = get();
        const t = today();
        const boost = s.inventory.xpBoostUntil > Date.now() ? 2 : 1;
        const gained = Math.round(base * boost);
        if (gained <= 0) return 0;
        const daily = s.daily.day === t ? s.daily : emptyDaily(t);
        const dayXp = pruneDayXp({ ...s.dayXp, [t]: (s.dayXp[t] ?? 0) + gained });
        const wk = weekId();
        const league = s.league.weekId === wk ? s.league : { ...s.league, weekId: wk, weeklyXp: 0 };
        set({
          xp: s.xp + gained,
          daily: { ...daily, xp: daily.xp + gained },
          dayXp,
          league: { ...league, weeklyXp: league.weeklyXp + gained },
        });
        if (dayXp[t] >= s.dailyGoal && s.streak.lastGoalDay !== t) advanceStreak(set, get, t);
        queueProfile(get());
        return gained;
      },
      addGems: (n) => set((s) => ({ gems: Math.max(0, s.gems + n) })),
      spendGems: (n) => {
        if (get().gems < n) return false;
        set((s) => ({ gems: s.gems - n }));
        return true;
      },

      // ------------------------------------------------------------ hearts
      syncHearts: () => {
        const s = get();
        const now = Date.now();
        if (s.hearts >= MAX_HEARTS) {
          if (s.heartsAt !== now) set({ heartsAt: now, hearts: MAX_HEARTS });
          return;
        }
        const regen = Math.floor((now - s.heartsAt) / HEART_REGEN_MS);
        if (regen <= 0) return;
        const hearts = Math.min(MAX_HEARTS, s.hearts + regen);
        set({ hearts, heartsAt: hearts >= MAX_HEARTS ? now : s.heartsAt + regen * HEART_REGEN_MS });
      },
      loseHeart: () => {
        if (entitlementsFor(get().tier).unlimitedHearts) return;
        get().syncHearts();
        const s = get();
        if (s.hearts <= 0) return;
        set({ hearts: s.hearts - 1, heartsAt: s.hearts >= MAX_HEARTS ? Date.now() : s.heartsAt });
      },
      addHeart: (n = 1) => {
        get().syncHearts();
        const s = get();
        const hearts = Math.min(MAX_HEARTS, s.hearts + n);
        set({ hearts, heartsAt: hearts >= MAX_HEARTS ? Date.now() : s.heartsAt });
      },
      refillHearts: () => set({ hearts: MAX_HEARTS, heartsAt: Date.now() }),

      // ------------------------------------------------------------ streak
      refreshStreak: () => {
        const s = get();
        const st = s.streak;
        const t = today();
        if (!st.lastGoalDay) return;
        const gap = daysBetween(st.lastGoalDay, t);
        if (gap <= 1) return;
        const missed = gap - 1;
        let freezes = st.freezes;
        let covered = 0;
        const goalDays = { ...st.goalDays };
        while (covered < missed && freezes > 0) {
          freezes--;
          covered++;
          goalDays[addDays(st.lastGoalDay, covered)] = 'freeze';
        }
        if (covered === missed) {
          set({ streak: { ...st, freezes, goalDays, lastGoalDay: addDays(t, -1) } });
          toast(`Streak Freeze used ${covered > 1 ? `${covered} times` : ''}. Your ${st.count} day streak is safe.`, 'info');
          return;
        }
        const month = monthKey();
        const canRepair = entitlementsFor(s.tier).streakRepair && st.repairMonth !== month && st.count > 0;
        if (canRepair) {
          for (let i = covered + 1; i <= missed; i++) goalDays[addDays(st.lastGoalDay, i)] = 'repair';
          set({ streak: { ...st, freezes, goalDays, lastGoalDay: addDays(t, -1), repairMonth: month, repairCelebrate: Date.now() } });
          return;
        }
        set({
          streak: { ...st, count: 0, freezes, goalDays, lastGoalDay: null, lost: { count: st.count, day: t } },
          wager: null,
        });
        if (s.wager) toast('You missed a day. The streak wager is lost.', 'warn');
      },
      buyItem: (item) => {
        const s = get();
        const e = entitlementsFor(s.tier);
        const fail = (reason: string) => ({ ok: false, reason });
        switch (item) {
          case 'streakFreeze':
            if (s.streak.freezes >= 2) return fail('You already have 2 Streak Freezes equipped.');
            if (!get().spendGems(PRICES.streakFreeze)) return fail('Not enough gems.');
            set((x) => ({ streak: { ...x.streak, freezes: x.streak.freezes + 1 } }));
            return { ok: true };
          case 'heartRefill':
            if (e.unlimitedHearts) return fail('You have unlimited hearts with your plan.');
            get().syncHearts();
            if (get().hearts >= MAX_HEARTS) return fail('Your hearts are already full.');
            if (!get().spendGems(PRICES.heartRefill)) return fail('Not enough gems.');
            get().refillHearts();
            return { ok: true };
          case 'wager':
            if (s.wager) return fail('You already have a wager running.');
            if (!get().spendGems(PRICES.wager)) return fail('Not enough gems.');
            set({ wager: { start: today(), stake: PRICES.wager, days: 0, lastDay: null } });
            return { ok: true };
          case 'timerBoost':
            if (!get().spendGems(PRICES.timerBoost)) return fail('Not enough gems.');
            set((x) => ({ inventory: { ...x.inventory, timerBoosts: x.inventory.timerBoosts + 1 } }));
            return { ok: true };
          case 'xpBoost':
            if (!get().spendGems(PRICES.xpBoost)) return fail('Not enough gems.');
            set((x) => ({ inventory: { ...x.inventory, xpBoostUntil: Math.max(Date.now(), x.inventory.xpBoostUntil) + 15 * 60 * 1000 } }));
            return { ok: true };
        }
      },

      // ------------------------------------------------------------ quests / league
      bumpStats: (patch) =>
        set((s) => {
          const t = today();
          const d = s.daily.day === t ? { ...s.daily } : emptyDaily(t);
          for (const k of Object.keys(patch) as StatKey[]) d[k] = (d[k] as number) + (patch[k] ?? 0);
          return { daily: d };
        }),
      claimQuest: (questId) => {
        const s = get();
        const t = today();
        const d = s.daily.day === t ? s.daily : emptyDaily(t);
        const q = questsForDay(t).find((x) => x.id === questId);
        if (!q || d.claimed.includes(q.id) || (d[q.metric] as number) < q.goal) return false;
        set({ daily: { ...d, claimed: [...d.claimed, q.id] }, gems: s.gems + q.gems });
        return true;
      },
      claimFriendQuest: () => {
        const s = get();
        const wk = weekId();
        const f = friendQuest(wk, s.league.weekId === wk ? s.league.weeklyXp : 0);
        if (!f.done || s.friendClaimedWeek === wk) return false;
        set({ friendClaimedWeek: wk, gems: s.gems + f.gems });
        return true;
      },
      leagueTick: () => {
        const s = get();
        const wk = weekId();
        if (s.league.weekId === wk) return;
        const prev = s.league;
        const top = LEAGUES.length - 1;
        // standings at the end of the week that just finished
        const board = buildBoard(prev.weekId, prev.tier, prev.weeklyXp, s.displayName, [], 1);
        const rank = board.findIndex((r) => r.isYou) + 1;
        let to = prev.tier;
        let outcome: 'promoted' | 'demoted' | 'stayed' = 'stayed';
        if (prev.weeklyXp > 0 && rank <= 7 && prev.tier < top) {
          to = prev.tier + 1;
          outcome = 'promoted';
        } else if ((prev.weeklyXp === 0 || rank > board.length - 5) && prev.tier > 0) {
          to = prev.tier - 1;
          outcome = 'demoted';
        }
        const gems = prev.weeklyXp > 0 ? gemsForRank(rank) : 0;
        set({
          gems: s.gems + gems,
          league: { tier: to, weekId: wk, weeklyXp: 0, last: { rank, outcome, fromTier: prev.tier, toTier: to, gems } },
        });
        toast(
          outcome === 'promoted' ? `Promoted to ${LEAGUES[to].name} league!` : outcome === 'demoted' ? `Moved down to ${LEAGUES[to].name} league.` : `You stayed in ${LEAGUES[to].name}. Finished #${rank}.`,
          outcome === 'promoted' ? 'success' : 'info'
        );
      },

      // ------------------------------------------------------------ progress
      finishLesson: ({ courseId, lessonId, accuracy, countsAsLesson }) => {
        const s = get();
        const cp = s.progress[courseId] ?? { completed: {}, legendary: {} };
        const prev = cp.completed[lessonId];
        const isNew = !prev;
        const completed = { ...cp.completed, [lessonId]: { count: (prev?.count ?? 0) + 1, best: Math.max(prev?.best ?? 0, accuracy), last: Date.now() } };
        const month = monthKey();
        const monthly = s.monthly.month === month ? s.monthly : { month, lessons: 0 };
        set({
          progress: { ...s.progress, [courseId]: { ...cp, completed } },
          monthly: countsAsLesson ? { ...monthly, lessons: monthly.lessons + (isNew ? 1 : 0) } : monthly,
        });
        if (s.userId) {
          void enqueue(
            'progress',
            { user_id: s.userId, course_id: courseId, lesson_id: lessonId, completions: completed[lessonId].count, best_accuracy: accuracy, completed_at: new Date().toISOString() },
            `progress:${courseId}:${lessonId}`
          ).catch(() => {});
        }
        return { streakExtended: false };
      },
      markLessonsComplete: (courseId, lessonIds) =>
        set((s) => {
          const cp = s.progress[courseId] ?? { completed: {}, legendary: {} };
          const completed = { ...cp.completed };
          for (const id of lessonIds) if (!completed[id]) completed[id] = { count: 1, best: 1, last: Date.now() };
          return { progress: { ...s.progress, [courseId]: { ...cp, completed, placed: true } } };
        }),
      setLegendary: (courseId, unitId) =>
        set((s) => {
          const cp = s.progress[courseId] ?? { completed: {}, legendary: {} };
          return { progress: { ...s.progress, [courseId]: { ...cp, legendary: { ...cp.legendary, [unitId]: true } } } };
        }),
      toggleSavedStory: (id) =>
        set((s) => ({ savedStories: s.savedStories.includes(id) ? s.savedStories.filter((x) => x !== id) : [...s.savedStories, id] })),
      setDownloaded: (unitId, v) =>
        set((s) => {
          const d = { ...s.downloaded };
          if (v) d[unitId] = true;
          else delete d[unitId];
          return { downloaded: d };
        }),
      setCantSpeak: () => set({ cantSpeakUntil: Date.now() + CANT_SPEAK_MS }),

      // ------------------------------------------------------------ family
      ensureFamily: () => {
        if (get().family) return;
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
        set({ family: { code, members: [] } });
      },
      upsertFamilyMember: (m) =>
        set((s) => {
          if (!s.family) return {};
          const exists = s.family.members.some((x) => x.id === m.id);
          if (!exists && s.family.members.length >= 5) return {};
          const members = exists ? s.family.members.map((x) => (x.id === m.id ? m : x)) : [...s.family.members, m];
          return { family: { ...s.family, members } };
        }),
      removeFamilyMember: (id) => set((s) => (s.family ? { family: { ...s.family, members: s.family.members.filter((m) => m.id !== id) } } : {})),
      toggleFamilyMember: (id) =>
        set((s) => (s.family ? { family: { ...s.family, members: s.family.members.map((m) => (m.id === id ? { ...m, active: !m.active } : m)) } } : {})),

      clearRepairCelebration: () => set((s) => ({ streak: { ...s.streak, repairCelebrate: null } })),
      resetAll: () => set({ ...initialData(), hydrated: true }),
    }),
    {
      name: 'linguaspark-app-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, ...rest } = s;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') data[k] = v;
        return data as unknown as AppState;
      },
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    }
  )
);

type SetFn = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;

function advanceStreak(set: SetFn, get: () => AppState, t: string) {
  const s = get();
  const st = s.streak;
  const y = addDays(t, -1);
  const count = st.lastGoalDay === y ? st.count + 1 : 1;
  const milestones = st.milestones.slice();
  let gems = s.gems;
  for (const m of STREAK_MILESTONES) {
    if (count >= m.days && !milestones.includes(m.days)) {
      milestones.push(m.days);
      gems += m.gems;
      toast(`${m.title}! ${m.days} day streak. +${m.gems} gems`, 'success');
    }
  }
  let wager = s.wager;
  if (wager && wager.lastDay !== t) {
    const days = wager.days + 1;
    if (days >= 7) {
      gems += wager.stake * 2;
      toast(`Wager won! +${wager.stake * 2} gems`, 'success');
      wager = null;
    } else wager = { ...wager, days, lastDay: t };
  }
  set({
    gems,
    wager,
    streak: { ...st, count, best: Math.max(st.best, count), lastGoalDay: t, goalDays: { ...st.goalDays, [t]: 'goal' }, milestones, lost: null },
  });
}

export function nextHeartMs(s: Pick<AppState, 'hearts' | 'heartsAt'>, now: number): number {
  if (s.hearts >= MAX_HEARTS) return 0;
  const elapsed = (now - s.heartsAt) % HEART_REGEN_MS;
  return HEART_REGEN_MS - elapsed;
}

export function leagueEndsIn(now: number = Date.now()): number {
  return weekEndMs(new Date(now)) - now;
}

