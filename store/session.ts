// Transient (not persisted) hand-off between screens: lesson result, call summary, roleplay grade.
import { create } from 'zustand';

export interface SessionResult {
  kind: string;
  title: string;
  courseId: string;
  xp: number;
  bonusXp: number;
  gems: number;
  accuracy: number;
  correct: number;
  total: number;
  passed: boolean;
  perfect: boolean;
  streakExtended: boolean;
  streakCount: number;
  durationMs: number;
  unitId?: string;
  lessonId?: string;
  heartEarned?: boolean;
  note?: string;
}

export interface CallSummary {
  courseId: string;
  persona: string;
  seconds: number;
  turns: number;
  vocab: { t: string; n: string }[];
  corrections: { said: string; hint: string; better: string }[];
  mode: 'ai' | 'offline';
  transcript: { who: 'you' | 'tutor'; text: string }[];
}

export interface RoleplayGrade {
  roleplayId: string;
  title: string;
  accuracy: number;
  fluency: number;
  goalsDone: string[];
  goalsTotal: number;
  tips: string[];
  better: { said: string; better: string }[];
  mode: 'ai' | 'offline';
  xp: number;
  llmFeedback?: string;
}

interface SessionStore {
  lastResult: SessionResult | null;
  callSummary: CallSummary | null;
  roleplayGrade: RoleplayGrade | null;
  setResult: (r: SessionResult | null) => void;
  setCallSummary: (c: CallSummary | null) => void;
  setRoleplayGrade: (g: RoleplayGrade | null) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  lastResult: null,
  callSummary: null,
  roleplayGrade: null,
  setResult: (lastResult) => set({ lastResult }),
  setCallSummary: (callSummary) => set({ callSummary }),
  setRoleplayGrade: (roleplayGrade) => set({ roleplayGrade }),
}));
