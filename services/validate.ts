// Validation + import parsing for courses (used by the Curriculum Studio and the seed check script).
import { buildCourse } from '@/data/builder';
import type { Course, CourseSpec, Exercise, LessonSpec, StorySpec, UnitSpec } from '@/data/types';
import { normalize } from '@/lib/text';

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

function dupes(list: string[]): boolean {
  const s = new Set(list.map((x) => normalize(x)));
  return s.size !== list.length;
}

export function validateExercise(e: Exercise, where: string): string[] {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(`${where}: ${m}`);
  switch (e.type) {
    case 'WORD_BANK':
    case 'LISTENING_TAP': {
      const bank = [...e.bank].map((t) => t.toLowerCase());
      for (const tok of e.answer.split(' ')) {
        const i = bank.indexOf(tok.toLowerCase());
        if (i < 0) bad(`answer word "${tok}" is not in the tile bank`);
        else bank.splice(i, 1);
      }
      break;
    }
    case 'TYPE_TRANSLATION':
      if (!isStr(e.answer) || !isStr(e.prompt)) bad('needs prompt and answer');
      break;
    case 'MULTIPLE_CHOICE':
      if (e.options.length < 2) bad('needs at least 2 options');
      if (e.correct < 0 || e.correct >= e.options.length) bad('correct index out of range');
      if (dupes(e.options.map((o) => o.text))) bad('duplicate options');
      break;
    case 'FILL_BLANK':
    case 'DIALOGUE_COMPLETE':
      if (e.options.length < 2) bad('needs at least 2 options');
      if (e.correct < 0 || e.correct >= e.options.length) bad('correct index out of range');
      if (dupes(e.options)) bad('duplicate options');
      break;
    case 'MATCH_PAIRS':
      if (e.pairs.length < 3) bad('needs at least 3 pairs');
      if (dupes(e.pairs.map((p) => p.l)) || dupes(e.pairs.map((p) => p.r))) bad('duplicate pair side');
      break;
    case 'SPEAKING_REPEAT':
      if (!isStr(e.phrase)) bad('needs a phrase');
      break;
    case 'INTERACTIVE_STORY':
      if (e.parts.length < 2) bad('story needs at least 2 parts');
      for (const q of e.questions) {
        if (q.after < 0 || q.after >= e.parts.length) bad('question placed after a missing part');
        if (q.correct < 0 || q.correct >= q.options.length) bad('story question correct index out of range');
      }
      break;
    case 'TIMED_CHALLENGE':
      if (e.pairs.length < 4) bad('needs at least 4 pairs');
      break;
    default:
      bad('unknown exercise type');
  }
  return errs;
}

export function validateCourse(c: Course): string[] {
  const errs: string[] = [];
  if (!isStr(c.id)) errs.push('course.id missing');
  if (!c.units?.length) errs.push('course has no units');
  const ids = new Set<string>();
  for (const u of c.units ?? []) {
    if (!u.lessons?.length) errs.push(`unit ${u.id} has no lessons`);
    for (const l of [...(u.lessons ?? []), u.story, u.timed]) {
      if (!l) continue;
      if (!l.exercises?.length) errs.push(`lesson ${l.id} has no exercises`);
      for (const e of l.exercises ?? []) {
        if (ids.has(e.id)) errs.push(`duplicate exercise id ${e.id}`);
        ids.add(e.id);
        errs.push(...validateExercise(e, e.id));
      }
    }
  }
  return errs;
}

// ---------------------------------------------------------------------------

function checkLessonSpec(l: unknown, where: string, errs: string[]): l is LessonSpec {
  const o = l as Record<string, unknown>;
  if (!o || typeof o !== 'object') {
    errs.push(`${where}: not an object`);
    return false;
  }
  if (!isStr(o.title)) errs.push(`${where}: title missing`);
  if (!isStr(o.tip)) o.tip = 'Practice makes perfect.';
  if (!isStr(o.icon)) o.icon = '⭐';
  if (!isArr(o.v) || o.v.length < 4) errs.push(`${where}: "v" needs at least 4 vocab items like ["hola","hello","👋"]`);
  else
    o.v.forEach((x, i) => {
      if (!isArr(x) || !isStr(x[0]) || !isStr(x[1])) errs.push(`${where}: v[${i}] must be [target, native, emoji?]`);
    });
  if (!isArr(o.s) || o.s.length < 4) errs.push(`${where}: "s" needs at least 4 sentences like ["Hola","Hello","note"]`);
  else
    o.s.forEach((x, i) => {
      if (!isArr(x) || !isStr(x[0]) || !isStr(x[1])) errs.push(`${where}: s[${i}] must be [target, native, note?]`);
    });
  const f = o.fill as Record<string, unknown> | undefined;
  if (!f || !isArr(f.opts) || typeof f.ans !== 'number' || (f.opts as unknown[]).length < 2) errs.push(`${where}: "fill" needs before, after, opts[], ans, tr`);
  else if ((f.ans as number) < 0 || (f.ans as number) >= (f.opts as unknown[]).length) errs.push(`${where}: fill.ans out of range`);
  else {
    f.before = typeof f.before === 'string' ? f.before : '';
    f.after = typeof f.after === 'string' ? f.after : '';
    f.tr = typeof f.tr === 'string' ? f.tr : '';
  }
  const d = o.dlg as Record<string, unknown> | undefined;
  if (!d || !isArr(d.lines) || !isArr(d.opts) || typeof d.ans !== 'number' || (d.opts as unknown[]).length < 2) errs.push(`${where}: "dlg" needs lines[], opts[], ans`);
  else if ((d.ans as number) < 0 || (d.ans as number) >= (d.opts as unknown[]).length) errs.push(`${where}: dlg.ans out of range`);
  return errs.length === 0;
}

/** story is optional in imports: we make a small one from the first lesson's sentences */
function defaultStory(u: UnitSpec): StorySpec {
  const sents = u.lessons.flatMap((l) => l.s).slice(0, 6);
  return {
    title: `${u.title}: Story`,
    cast: [
      { id: 'a', name: 'Alex', emoji: '🧑' },
      { id: 'b', name: 'Sam', emoji: '👩' },
    ],
    parts: sents.map((s, i) => [i % 2 === 0 ? 'a' : 'b', s[0], s[1]] as [string, string, string]),
    questions: [
      {
        after: Math.min(1, sents.length - 1),
        q: `What does “${sents[0][0]}” mean?`,
        opts: [sents[0][1], sents[1][1], sents[2][1]],
        ans: 0,
      },
    ],
  };
}

export interface ImportResult {
  course?: Course;
  errors: string[];
}

export function parseCourseJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== 'object' || !isArr(o.units)) return { errors: ['Top level must be an object with a "units" array.'] };

  // Full Course JSON (already has exercises)
  const firstLesson = ((o.units[0] as Record<string, unknown>)?.lessons as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined;
  if (firstLesson && isArr(firstLesson.exercises)) {
    const course = o as unknown as Course;
    course.builtin = false;
    course.roleplays = course.roleplays ?? [];
    const errs = validateCourse(course);
    if (!course.tutor) errs.push('Full course JSON needs a "tutor" kit; use the compact format instead to get a default one.');
    return errs.length ? { errors: errs } : { course, errors: [] };
  }

  // Compact CourseSpec
  const errs: string[] = [];
  const spec = o as unknown as CourseSpec;
  if (!isStr(spec.id) || !/^[a-z0-9-]+$/.test(spec.id)) errs.push('"id" must be lowercase letters, numbers and dashes, e.g. "fr-for-en".');
  if (!isStr(spec.title)) errs.push('"title" missing.');
  if (!spec.native || !isStr(spec.native.code) || !isStr(spec.native.name)) errs.push('"native" needs code, name, tts (e.g. {"code":"en","name":"English","tts":"en-US"}).');
  if (!spec.target || !isStr(spec.target.code) || !isStr(spec.target.name)) errs.push('"target" needs code, name, tts, stt (e.g. {"code":"fr","name":"French","tts":"fr-FR","stt":"fr-FR"}).');
  if (!errs.length) {
    spec.native.tts = spec.native.tts || spec.native.code;
    spec.target.tts = spec.target.tts || spec.target.code;
    spec.target.stt = spec.target.stt || spec.target.tts;
    spec.flag = spec.flag || '🌍';
    spec.persona = spec.persona || { name: 'Alex', emoji: '🧑‍🏫', color: '#1CB0F6', role: `${spec.target.name} tutor` };
  }
  spec.units.forEach((u: UnitSpec, ui: number) => {
    const w = `units[${ui}]`;
    if (!isStr(u.title)) errs.push(`${w}.title missing`);
    u.subtitle = u.subtitle ?? '';
    u.section = u.section || `Section ${ui + 1}`;
    u.theme = u.theme || (['green', 'blue', 'purple', 'orange', 'red', 'teal'] as const)[ui % 6];
    u.intro = u.intro || `Welcome to ${u.title}.`;
    u.tips = isArr(u.tips) ? u.tips : [];
    u.roleplays = isArr(u.roleplays) ? u.roleplays : [];
    if (!isArr(u.lessons) || u.lessons.length === 0) errs.push(`${w}.lessons needs at least one lesson`);
    else u.lessons.forEach((l, li) => checkLessonSpec(l, `${w}.lessons[${li}]`, errs));
    if (!errs.length && !u.story) u.story = defaultStory(u);
  });
  if (errs.length) return { errors: errs };
  try {
    const course = buildCourse(spec, false);
    const verrs = validateCourse(course);
    return verrs.length ? { errors: verrs } : { course, errors: [] };
  } catch (e) {
    return { errors: [`Could not build course: ${(e as Error).message}`] };
  }
}

export const IMPORT_TEMPLATE = JSON.stringify(
  {
    id: 'fr-for-en',
    title: 'French for English Speakers',
    flag: '🇫🇷',
    native: { code: 'en', name: 'English', tts: 'en-US' },
    target: { code: 'fr', name: 'French', tts: 'fr-FR', stt: 'fr-FR' },
    persona: { name: 'Camille', emoji: '👩🏼‍🏫', color: '#1CB0F6', role: 'French tutor' },
    units: [
      {
        title: 'Bonjour!',
        subtitle: 'Greetings',
        theme: 'blue',
        intro: 'Say hello in French.',
        tips: [{ title: 'Politeness', body: 'Use “vous” with strangers and “tu” with friends.', examples: [{ t: 'Bonjour', n: 'Hello' }] }],
        lessons: [
          {
            title: 'Greetings',
            icon: '👋',
            tip: 'Bonjour is for daytime. Bonsoir is for evening.',
            v: [
              ['bonjour', 'hello', '👋'],
              ['bonsoir', 'good evening', '🌙'],
              ['merci', 'thank you', '🙏'],
              ['oui', 'yes'],
              ['non', 'no'],
            ],
            s: [
              ['Bonjour, comment ça va ?', 'Hello, how are you?'],
              ['Ça va bien, merci', 'I am fine, thank you'],
              ['Merci beaucoup', 'Thank you very much'],
              ['Oui, s’il vous plaît', 'Yes, please'],
            ],
            fill: { before: '', after: ', comment ça va ?', opts: ['Bonjour', 'Merci', 'Non'], ans: 0, tr: 'Hello, how are you?' },
            dlg: { lines: ['Bonjour, comment ça va ?'], opts: ['Ça va bien, merci.', 'Non, non.', 'Bonsoir, oui.'], ans: 0, tr: 'Hello, how are you?' },
          },
        ],
        roleplays: [],
      },
    ],
  },
  null,
  2
);
