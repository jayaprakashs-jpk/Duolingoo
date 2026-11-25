// Generates review exercises from learned words (used by weak-skill practice, heart practice and the gyms).
import type { Course, Exercise, VocabItem } from '@/data/types';
import { pick, seededShuffle } from '@/lib/rng';
import type { WordRow } from './db';

function courseVocab(course: Course): VocabItem[] {
  return course.units.flatMap((u) => u.lessons.flatMap((l) => l.vocab));
}

function mcOptions(correct: string, pool: string[], seed: string): { options: { text: string }[]; correct: number } {
  const others = pick(
    Array.from(new Set(pool)).filter((x) => x !== correct),
    3,
    seed
  );
  const all = seededShuffle([correct, ...others], seed + ':s');
  return { options: all.map((text) => ({ text })), correct: all.indexOf(correct) };
}

export interface DrillOptions {
  count: number;
  /** listening + speaking only */
  audioOnly?: boolean;
}

export function drillFromWords(words: Pick<WordRow, 'target' | 'native' | 'emoji'>[], course: Course, opts: DrillOptions): Exercise[] {
  const cv = courseVocab(course);
  const targets = Array.from(new Set([...words.map((w) => w.target), ...cv.map((v) => v.t)]));
  const natives = Array.from(new Set([...words.map((w) => w.native), ...cv.map((v) => v.n)]));
  const out: Exercise[] = [];
  const list = words.slice(0, opts.count);
  list.forEach((w, i) => {
    const base = `drill:${course.id}:${w.target}`;
    const kind = opts.audioOnly ? (i % 2 === 0 ? 'listen' : 'speak') : (['mc', 'type', 'listen', 'mc2'] as const)[i % 4];
    if (kind === 'mc') {
      const o = mcOptions(w.native, natives, base + ':mc');
      out.push({ id: `${base}:mc`, type: 'MULTIPLE_CHOICE', prompt: `What does “${w.target}” mean?`, speak: w.target, options: o.options, correct: o.correct, focus: [w.target], explain: `“${w.target}” = “${w.native}”.` });
    } else if (kind === 'mc2') {
      const o = mcOptions(w.target, targets, base + ':mc2');
      out.push({ id: `${base}:mc2`, type: 'MULTIPLE_CHOICE', prompt: `How do you say “${w.native}” in ${course.targetName}?`, options: o.options, correct: o.correct, focus: [w.target], explain: `“${w.native}” in ${course.targetName} is “${w.target}”.` });
    } else if (kind === 'type') {
      out.push({ id: `${base}:type`, type: 'TYPE_TRANSLATION', prompt: w.native, dir: 'toTarget', answer: w.target, focus: [w.target], explain: `“${w.native}” in ${course.targetName} is “${w.target}”.` });
    } else if (kind === 'listen') {
      const ans = w.target.split(' ');
      const dis = pick(targets.filter((t) => !ans.includes(t)), 3, base + ':l');
      out.push({ id: `${base}:listen`, type: 'LISTENING_TAP', audio: w.target, answer: w.target, bank: seededShuffle([...ans, ...dis.flatMap((d) => d.split(' ').slice(0, 1))], base + ':lb'), translation: w.native, focus: [w.target], explain: `You heard “${w.target}”, which means “${w.native}”.` });
    } else {
      out.push({ id: `${base}:speak`, type: 'SPEAKING_REPEAT', phrase: w.target, translation: w.native, focus: [w.target], explain: `Say “${w.target}” (${w.native}).` });
    }
    if (!opts.audioOnly && (i + 1) % 4 === 0) {
      const grp = list.slice(i - 3, i + 1);
      out.push({ id: `${base}:match`, type: 'MATCH_PAIRS', pairs: grp.map((g) => ({ l: g.target, r: g.native })), focus: grp.map((g) => g.target), explain: 'Match each word with its meaning.' });
    }
  });
  return out;
}
