import { hashString, seededShuffle } from '@/lib/rng';
import { weekProgress } from '@/lib/date';

export type StatKey = 'xp' | 'lessons' | 'acc90' | 'perfect' | 'speaking' | 'listening' | 'words';

export interface DailyStats {
  day: string;
  xp: number;
  lessons: number;
  acc90: number;
  perfect: number;
  speaking: number;
  listening: number;
  words: number;
  claimed: string[];
}

export interface QuestDef {
  id: string;
  title: string;
  metric: StatKey;
  goal: number;
  gems: number;
  icon: string;
}

export const emptyDaily = (day: string): DailyStats => ({
  day,
  xp: 0,
  lessons: 0,
  acc90: 0,
  perfect: 0,
  speaking: 0,
  listening: 0,
  words: 0,
  claimed: [],
});

const XP_QUESTS: QuestDef[] = [
  { id: 'xp20', title: 'Earn 20 XP', metric: 'xp', goal: 20, gems: 10, icon: '⚡' },
  { id: 'xp30', title: 'Earn 30 XP', metric: 'xp', goal: 30, gems: 20, icon: '⚡' },
  { id: 'xp50', title: 'Earn 50 XP', metric: 'xp', goal: 50, gems: 30, icon: '⚡' },
];
const ACC_QUESTS: QuestDef[] = [
  { id: 'acc2', title: 'Get 90%+ accuracy in 2 lessons', metric: 'acc90', goal: 2, gems: 30, icon: '🎯' },
  { id: 'lessons3', title: 'Complete 3 lessons', metric: 'lessons', goal: 3, gems: 25, icon: '📘' },
];
const SKILL_QUESTS: QuestDef[] = [
  { id: 'speak1', title: 'Complete 1 Speaking exercise', metric: 'speaking', goal: 1, gems: 20, icon: '🎤' },
  { id: 'listen5', title: 'Answer 5 Listening exercises', metric: 'listening', goal: 5, gems: 20, icon: '🎧' },
  { id: 'perfect1', title: 'Finish a lesson with no mistakes', metric: 'perfect', goal: 1, gems: 25, icon: '💯' },
  { id: 'words10', title: 'Practice 10 words', metric: 'words', goal: 10, gems: 20, icon: '🔤' },
];

/** Three quests per day: an XP quest, an accuracy/lesson quest and a skill quest. Same for the whole day. */
export function questsForDay(day: string): QuestDef[] {
  const h = hashString(day);
  const xp = XP_QUESTS[h % XP_QUESTS.length];
  const acc = ACC_QUESTS[(h >> 3) % ACC_QUESTS.length];
  // keep "Complete 1 Speaking exercise" common: it is first in the shuffled list on most days
  const skill = seededShuffle(SKILL_QUESTS, day)[0];
  return [xp, acc, skill];
}

export const MONTHLY_GOAL = 30;

export interface FriendQuest {
  target: number;
  partner: string;
  partnerAvatar: string;
  partnerXp: number;
  myXp: number;
  done: boolean;
  gems: number;
}

const PARTNERS: [string, string][] = [['Ananya', '🦋'], ['Diego', '🦊'], ['Kavya', '🐼'], ['Sofia', '🦄'], ['Arjun', '🐯']];

/** Friend quest: you and a partner earn 250 XP together this week. Partner XP is simulated in guest mode. */
export function friendQuest(weekId: string, myXp: number, now: number = Date.now()): FriendQuest {
  const target = 250;
  const h = hashString(weekId);
  const [partner, avatar] = PARTNERS[h % PARTNERS.length];
  const pace = 0.45 + ((h >> 4) % 40) / 100; // 0.45 .. 0.84 of target
  const partnerXp = Math.round(target * pace * Math.pow(weekProgress(now), 0.85));
  return { target, partner, partnerAvatar: avatar, partnerXp, myXp, done: myXp + partnerXp >= target, gems: 60 };
}
