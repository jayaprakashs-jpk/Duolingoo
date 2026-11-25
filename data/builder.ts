// Turns the compact authoring format (CourseSpec) into fully playable Course data.
// The same builder runs for the built-in seed courses and for courses imported in the Curriculum Studio.
import { pick, seededShuffle } from '@/lib/rng';
import { normalize } from '@/lib/text';
import type {
  Course,
  CourseSpec,
  Exercise,
  Lesson,
  LessonSpec,
  Pair,
  StorySpec,
  TutorKit,
  Unit,
  UnitSpec,
  UnitTheme,
  VocabItem,
} from './types';
import { genericTutorKit } from './seed/tutor-generic';

export const UNIT_THEMES: Record<UnitTheme, { color: string; dark: string }> = {
  green: { color: '#58CC02', dark: '#58A700' },
  blue: { color: '#1CB0F6', dark: '#1899D6' },
  purple: { color: '#CE82FF', dark: '#A568CC' },
  orange: { color: '#FF9600', dark: '#CC7800' },
  red: { color: '#FF4B4B', dark: '#D33131' },
  teal: { color: '#00CD9C', dark: '#00A67D' },
};

const PUNCT = /[.,!?¿¡;:"“”]/g;
export const clean = (s: string) => s.replace(PUNCT, '').replace(/\s+/g, ' ').trim();

const CONTRACTIONS: [RegExp, string][] = [
  [/\bI am\b/gi, "I'm"],
  [/\bIt is\b/gi, "It's"],
  [/\bHe is\b/gi, "He's"],
  [/\bShe is\b/gi, "She's"],
  [/\bThat is\b/gi, "That's"],
  [/\bWhat is\b/gi, "What's"],
  [/\bWhere is\b/gi, "Where's"],
  [/\bThere is\b/gi, "There's"],
  [/\bI will\b/gi, "I'll"],
  [/\bdo not\b/gi, "don't"],
  [/\bDo not\b/gi, "Don't"],
  [/\bWe are\b/gi, "We're"],
  [/\bThey are\b/gi, "They're"],
  [/\bYou are\b/gi, "You're"],
];

export function acceptVariants(answer: string): string[] {
  const out = new Set<string>();
  let contracted = answer;
  for (const [re, rep] of CONTRACTIONS) contracted = contracted.replace(re, rep);
  if (contracted !== answer) out.add(contracted);
  return Array.from(out);
}

function focusOf(sentence: string, vocab: VocabItem[]): string[] {
  const toks = new Set(normalize(sentence).split(' '));
  const out: string[] = [];
  for (const v of vocab) {
    const vt = normalize(v.t).split(' ');
    if (vt.length && vt.every((w) => toks.has(w))) out.push(v.t);
  }
  return out;
}

interface Ctx {
  courseId: string;
  targetName: string;
  nativeName: string;
  allVocab: VocabItem[];
  unitTargetTokens: string[];
  unitNativeTokens: string[];
}

function shuffleOptions<T>(opts: T[], correctIdx: number, seed: string): { options: T[]; correct: number } {
  const idx = seededShuffle(opts.map((_, i) => i), seed);
  return { options: idx.map((i) => opts[i]), correct: idx.indexOf(correctIdx) };
}

function distractorTiles(answerTokens: string[], pool: string[], seed: string, count: number): string[] {
  const have = new Set(answerTokens.map((t) => t.toLowerCase()));
  const cand = Array.from(new Set(pool.map((t) => t.toLowerCase()))).filter((t) => !have.has(t) && t.length > 0);
  return pick(cand, count, seed);
}

function wordBank(
  id: string,
  from: string,
  to: string,
  dir: 'toTarget' | 'toNative',
  ctx: Ctx,
  lesson: LessonSpec,
  note?: string
): Exercise {
  const answer = clean(to);
  const ans = answer.split(' ');
  const pool = dir === 'toTarget' ? ctx.unitTargetTokens : ctx.unitNativeTokens;
  const dis = distractorTiles(ans, pool, id, ans.length <= 3 ? 2 : 3);
  const bank = seededShuffle([...ans, ...dis], id + ':bank');
  const focusSrc = dir === 'toTarget' ? answer : from;
  return {
    id,
    type: 'WORD_BANK',
    prompt: from,
    dir,
    answer,
    bank,
    accept: dir === 'toTarget' ? acceptVariants(answer) : undefined,
    focus: focusOf(focusSrc, lesson.v.map((v) => ({ t: v[0], n: v[1] }))),
    explain: note ?? lesson.tip,
  };
}

function vocabOptions(v: VocabItem, ctx: Ctx, seed: string, need: number, side: 't' | 'n', requireEmoji = false) {
  const same = ctx.allVocab.filter((x) => x.t !== v.t && (!requireEmoji || x.e));
  const others = pick(same, need, seed);
  const all = [v, ...others];
  const correctIdx = 0;
  const s = shuffleOptions(all, correctIdx, seed + ':o');
  return { items: s.options.map((x) => ({ text: x[side], emoji: x.e })), correct: s.correct };
}

function buildLessonExercises(spec: LessonSpec, lessonId: string, ctx: Ctx, unitIdx: number): Exercise[] {
  const vocab: VocabItem[] = spec.v.map((v) => ({ t: v[0], n: v[1], e: v[2] }));
  const [s0, s1, s2, s3] = spec.s;
  const out: Exercise[] = [];

  // 1. meaning check with audio
  const v0 = vocab[0];
  const o0 = vocabOptions(v0, ctx, lessonId + ':mc0', 3, 'n');
  out.push({
    id: `${lessonId}.e1`,
    type: 'MULTIPLE_CHOICE',
    prompt: `What does “${v0.t}” mean?`,
    speak: v0.t,
    options: o0.items.map((o) => ({ text: o.text })),
    correct: o0.correct,
    focus: [v0.t],
    explain: `“${v0.t}” = “${v0.n}”. ${spec.tip}`,
  });

  // 2. match all vocab
  out.push({
    id: `${lessonId}.e2`,
    type: 'MATCH_PAIRS',
    pairs: vocab.map((v) => ({ l: v.t, r: v.n })),
    focus: vocab.map((v) => v.t),
    explain: 'Match each word with its meaning. Tap a word, then tap its partner.',
  });

  // 3. picture card (needs emoji) or another meaning check
  const withEmoji = vocab.find((v) => v.e);
  if (withEmoji) {
    const o = vocabOptions(withEmoji, ctx, lessonId + ':pic', 3, 't', true);
    out.push({
      id: `${lessonId}.e3`,
      type: 'MULTIPLE_CHOICE',
      prompt: `Which one is “${withEmoji.n}”?`,
      options: o.items,
      correct: o.correct,
      focus: [withEmoji.t],
      explain: `“${withEmoji.t}” means “${withEmoji.n}” ${withEmoji.e ?? ''}. ${spec.tip}`,
    });
  } else {
    const v = vocab[2];
    const o = vocabOptions(v, ctx, lessonId + ':mc2', 3, 'n');
    out.push({
      id: `${lessonId}.e3`,
      type: 'MULTIPLE_CHOICE',
      prompt: `What does “${v.t}” mean?`,
      speak: v.t,
      options: o.items.map((x) => ({ text: x.text })),
      correct: o.correct,
      focus: [v.t],
      explain: `“${v.t}” = “${v.n}”.`,
    });
  }

  // 4. word bank native -> target
  out.push(wordBank(`${lessonId}.e4`, s0[1], s0[0], 'toTarget', ctx, spec, s0[2]));

  // 5. listening
  out.push({
    id: `${lessonId}.e5`,
    type: 'LISTENING_TAP',
    audio: clean(s1[0]),
    answer: clean(s1[0]),
    bank: seededShuffle(
      [...clean(s1[0]).split(' '), ...distractorTiles(clean(s1[0]).split(' '), ctx.unitTargetTokens, `${lessonId}.e5`, 3)],
      `${lessonId}.e5:bank`
    ),
    translation: s1[1],
    accept: acceptVariants(clean(s1[0])),
    focus: focusOf(s1[0], vocab),
    explain: s1[2] ?? spec.tip,
  });

  // 6. native -> target meaning (reverse MC)
  const v1 = vocab[1];
  const o1 = vocabOptions(v1, ctx, lessonId + ':mc1', 3, 't');
  out.push({
    id: `${lessonId}.e6`,
    type: 'MULTIPLE_CHOICE',
    prompt: `How do you say “${v1.n}” in ${ctx.targetName}?`,
    options: o1.items.map((o) => ({ text: o.text })),
    correct: o1.correct,
    focus: [v1.t],
    explain: `“${v1.n}” in ${ctx.targetName} is “${v1.t}”.`,
  });

  // 7. typed translation
  out.push({
    id: `${lessonId}.e7`,
    type: 'TYPE_TRANSLATION',
    prompt: s2[1],
    dir: 'toTarget',
    answer: clean(s2[0]),
    accept: acceptVariants(clean(s2[0])),
    focus: focusOf(s2[0], vocab),
    explain: s2[2] ?? spec.tip,
  });

  // 8. fill the blank
  out.push({
    id: `${lessonId}.e8`,
    type: 'FILL_BLANK',
    before: spec.fill.before,
    after: spec.fill.after,
    options: spec.fill.opts,
    correct: spec.fill.ans,
    translation: spec.fill.tr,
    explain: spec.fill.note ?? spec.tip,
  });

  // 9. speaking
  out.push({
    id: `${lessonId}.e9`,
    type: 'SPEAKING_REPEAT',
    phrase: clean(s0[0]),
    translation: s0[1],
    focus: focusOf(s0[0], vocab),
    explain: `Say it slowly first, then at normal speed. ${s0[2] ?? spec.tip}`,
  });

  // 10. dialogue
  out.push({
    id: `${lessonId}.e10`,
    type: 'DIALOGUE_COMPLETE',
    lines: spec.dlg.lines.map((text, i) => ({ who: i % 2 === 0 ? 'A' : 'B', text })),
    options: spec.dlg.opts,
    correct: spec.dlg.ans,
    translation: spec.dlg.tr,
    explain: spec.dlg.note ?? spec.tip,
  });

  // 11. word bank target -> native (reading) on alternating units so all scripts are exercised
  out.push(
    unitIdx % 2 === 0
      ? wordBank(`${lessonId}.e11`, s3[0], s3[1], 'toNative', ctx, spec, s3[2])
      : wordBank(`${lessonId}.e11`, s3[1], s3[0], 'toTarget', ctx, spec, s3[2])
  );

  return out;
}

function buildStoryLesson(spec: StorySpec, id: string): Lesson {
  return {
    id,
    title: spec.title,
    icon: '📖',
    kind: 'story',
    vocab: [],
    exercises: [
      {
        id: `${id}.e1`,
        type: 'INTERACTIVE_STORY',
        title: spec.title,
        cast: spec.cast,
        parts: spec.parts.map((p) => ({ who: p[0], text: p[1], tr: p[2] })),
        questions: spec.questions.map((q) => ({ after: q.after, q: q.q, options: q.opts, correct: q.ans })),
        explain: 'Listen to the story, then answer the comprehension questions.',
      },
    ],
  };
}

function buildUnit(spec: UnitSpec, unitIdx: number, courseId: string, ctxBase: Omit<Ctx, 'unitTargetTokens' | 'unitNativeTokens'>): Unit {
  const unitId = `${courseId}.u${unitIdx + 1}`;
  const unitTarget = spec.lessons.flatMap((l) => l.s.flatMap((s) => clean(s[0]).split(' ')));
  const unitNative = spec.lessons.flatMap((l) => l.s.flatMap((s) => clean(s[1]).split(' ')));
  const ctx: Ctx = { ...ctxBase, unitTargetTokens: unitTarget, unitNativeTokens: unitNative };

  const lessons: Lesson[] = spec.lessons.map((ls, i) => {
    const lid = `${unitId}.l${i + 1}`;
    return {
      id: lid,
      title: ls.title,
      icon: ls.icon,
      kind: 'lesson' as const,
      vocab: ls.v.map((v) => ({ t: v[0], n: v[1], e: v[2] })),
      exercises: buildLessonExercises(ls, lid, ctx, unitIdx),
    };
  });

  const unitPairs: Pair[] = lessons.flatMap((l) => l.vocab.map((v) => ({ l: v.t, r: v.n })));
  const timed: Lesson = {
    id: `${unitId}.timed`,
    title: unitIdx % 2 === 0 ? 'Match Madness' : 'Ramp Up',
    icon: '⚡',
    kind: 'timed',
    vocab: [],
    exercises: [
      {
        id: `${unitId}.timed.e1`,
        type: 'TIMED_CHALLENGE',
        mode: unitIdx % 2 === 0 ? 'match_madness' : 'ramp_up',
        seconds: 90,
        pairs: unitPairs,
        explain: 'Match as many pairs as you can in 90 seconds. Wrong taps cost you time.',
      },
    ],
  };

  const theme = UNIT_THEMES[spec.theme];
  return {
    id: unitId,
    title: spec.title,
    subtitle: spec.subtitle,
    section: spec.section,
    color: theme.color,
    dark: theme.dark,
    guidebook: { intro: spec.intro, tips: spec.tips },
    lessons,
    story: buildStoryLesson(spec.story, `${unitId}.story`),
    timed,
    roleplayIds: spec.roleplays.map((r) => (r.includes('.') ? r : `${courseId}.rp.${r}`)),
  };
}

export function buildCourse(spec: CourseSpec, builtin = false): Course {
  const allVocab: VocabItem[] = spec.units.flatMap((u) =>
    u.lessons.flatMap((l) => l.v.map((v) => ({ t: v[0], n: v[1], e: v[2] })))
  );
  const base = { courseId: spec.id, targetName: spec.target.name, nativeName: spec.native.name, allVocab };
  const units = spec.units.map((u, i) => buildUnit(u, i, spec.id, base));
  const tutor: TutorKit = spec.tutor ?? genericTutorKit(spec.target.name);
  return {
    id: spec.id,
    title: spec.title,
    flag: spec.flag,
    nativeLang: spec.native.code,
    targetLang: spec.target.code,
    nativeName: spec.native.name,
    targetName: spec.target.name,
    sttLocale: spec.target.stt,
    ttsLocale: spec.target.tts,
    nativeTts: spec.native.tts,
    persona: spec.persona,
    units,
    roleplays: spec.roleplays ?? [],
    tutor,
    builtin,
  };
}

export function courseExerciseCount(c: Course): number {
  return c.units.reduce(
    (n, u) => n + u.lessons.reduce((m, l) => m + l.exercises.length, 0) + u.story.exercises.length + u.timed.exercises.length,
    0
  );
}
