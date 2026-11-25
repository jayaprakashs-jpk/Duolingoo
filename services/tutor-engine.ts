// Pure, dependency-free tutor engines: offline video-call replies, grammar fixes, roleplay steps and grading.
// No React Native or network imports so they can be unit-tested in plain Node (scripts/check-engines.ts).
import type { Course, Roleplay, TutorFix, TutorKit } from '@/data/types';
import { normalize } from '@/lib/text';

// ---------------------------------------------------------------- offline call engine
export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

const hasKey = (padded: string, key: string) => padded.includes(` ${normalize(key)} `);

export interface CallEngineState {
  turn: number;
  counts: Record<number, number>;
}

export interface TutorLine {
  t: string;
  n: string;
}

export function ruleCallReply(kit: TutorKit, text: string, state: CallEngineState): { line: TutorLine; goodbye: boolean } {
  const padded = ` ${normalize(text)} `;
  for (let i = 0; i < kit.topics.length; i++) {
    const topic = kit.topics[i];
    if (topic.keys.some((k) => hasKey(padded, k))) {
      const n = state.counts[i] ?? 0;
      state.counts[i] = n + 1;
      return { line: topic.replies[n % topic.replies.length], goodbye: i === 0 && topic.keys.some((k) => hasKey(padded, k)) && /bye|adios|chao|hasta|goodbye|see you|good night|talk later/.test(padded) };
    }
  }
  const f = kit.fallbacks[state.turn % kit.fallbacks.length];
  return { line: f, goodbye: false };
}

export function findFixes(kit: TutorKit, text: string): TutorFix[] {
  const n = normalize(text);
  const out: TutorFix[] = [];
  for (const fix of kit.fixes) {
    try {
      if (new RegExp(fix.re, 'i').test(n)) out.push(fix);
    } catch {
      /* bad regex in imported kit: ignore */
    }
  }
  return out;
}

export function vocabUsed(course: Course, texts: string[]): { t: string; n: string }[] {
  const padded = ` ${normalize(texts.join(' . '))} `;
  const seen = new Set<string>();
  const out: { t: string; n: string }[] = [];
  for (const u of course.units)
    for (const l of u.lessons)
      for (const v of l.vocab) {
        if (seen.has(v.t)) continue;
        if (padded.includes(` ${normalize(v.t)} `)) {
          seen.add(v.t);
          out.push({ t: v.t, n: v.n });
        }
      }
  return out;
}

// ---------------------------------------------------------------- roleplay engine
export interface RpState {
  done: string[];
  /** user messages that triggered at least one step */
  matched: { text: string; goals: string[]; stepIdx: number }[];
  userTexts: string[];
  fallbackIdx: number;
}

export const newRpState = (): RpState => ({ done: [], matched: [], userTexts: [], fallbackIdx: 0 });

export function rpStep(rp: Roleplay, st: RpState, text: string): { reply: { text: string; tr: string }; newGoals: string[]; allDone: boolean; hit: boolean } {
  st.userTexts.push(text);
  const padded = ` ${normalize(text)} `;
  const hits: number[] = [];
  rp.steps.forEach((s, i) => {
    if (s.keys.some((k) => hasKey(padded, k))) hits.push(i);
  });
  if (!hits.length) {
    const f = rp.fallbacks[st.fallbackIdx % rp.fallbacks.length];
    st.fallbackIdx++;
    return { reply: f, newGoals: [], allDone: st.done.length >= rp.goals.length, hit: false };
  }
  const newGoals: string[] = [];
  for (const i of hits) {
    const g = rp.steps[i].goal;
    if (g && !st.done.includes(g)) {
      st.done.push(g);
      newGoals.push(g);
    }
  }
  const last = rp.steps[hits[hits.length - 1]];
  st.matched.push({ text, goals: newGoals, stepIdx: hits[hits.length - 1] });
  const allDone = st.done.length >= rp.goals.length;
  return { reply: { text: last.reply, tr: last.tr }, newGoals, allDone, hit: true };
}

export interface RoleplayScore {
  accuracy: number;
  fluency: number;
  tips: string[];
  better: { said: string; better: string }[];
  xp: number;
}

export function scoreRoleplay(rp: Roleplay, st: RpState): RoleplayScore {
  const total = rp.goals.length;
  const done = st.done.length;
  const msgs = st.userTexts.length;
  const goodMsgs = st.matched.length;
  const accuracy = Math.round(100 * (done / total) * 0.75 + 25 * Math.min(1, msgs ? goodMsgs / msgs : 0));
  const avgWords = msgs ? st.userTexts.reduce((n, t) => n + t.trim().split(/\s+/).filter(Boolean).length, 0) / msgs : 0;
  const fluency = Math.round(Math.min(100, (avgWords / 6) * 100));
  const tips: string[] = [];
  if (!msgs) tips.push('You did not say anything yet. Try the suggested phrases.');
  if (msgs && avgWords < 3) tips.push('Try full sentences instead of single words. Aim for 4 to 6 words.');
  if (msgs && avgWords >= 3 && avgWords < 5) tips.push('Good start. Add a polite word like please or thank you to sound natural.');
  if (fluency >= 80) tips.push('Great fluency. Your sentences are a natural length.');
  const missing = rp.goals.filter((g) => !st.done.includes(g.id));
  if (missing.length) tips.push(`Goals you missed: ${missing.map((g) => g.text.toLowerCase()).join(', ')}.`);
  if (!missing.length) tips.push('You completed every goal. Try again with different words to build flexibility.');
  const better: { said: string; better: string }[] = [];
  for (const m of st.matched) {
    const step = rp.steps[m.stepIdx];
    if (step?.better && normalize(step.better) !== normalize(m.text)) better.push({ said: m.text, better: step.better });
  }
  for (const g of missing) {
    const step = rp.steps.find((s) => s.goal === g.id);
    if (step?.better) better.push({ said: '(you did not say this)', better: step.better });
  }
  return { accuracy, fluency, tips, better: better.slice(0, 5), xp: 10 + Math.round(accuracy / 10) * 2 };
}
