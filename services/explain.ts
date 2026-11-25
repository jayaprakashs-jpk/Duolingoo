// "Explain my answer": builds a plain-language breakdown for any exercise.
import type { Course, Exercise } from '@/data/types';
import { normalize } from '@/lib/text';
import type { Grade } from './grading';

export interface ExplainSection {
  title: string;
  body: string;
}

const dictCache = new Map<string, { t2n: Map<string, string>; n2t: Map<string, string> }>();

export function dictionaryFor(course: Course) {
  const hit = dictCache.get(course.id);
  if (hit) return hit;
  const t2n = new Map<string, string>();
  const n2t = new Map<string, string>();
  for (const u of course.units)
    for (const l of u.lessons)
      for (const v of l.vocab) {
        t2n.set(normalize(v.t), v.n);
        n2t.set(normalize(v.n), v.t);
      }
  const d = { t2n, n2t };
  dictCache.set(course.id, d);
  return d;
}

/** word-by-word gloss of a target-language sentence using the course vocabulary (longest match first) */
export function gloss(sentence: string, course: Course): { word: string; meaning: string }[] {
  const { t2n } = dictionaryFor(course);
  const words = sentence.split(/\s+/).filter(Boolean);
  const out: { word: string; meaning: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    const two = i + 1 < words.length ? `${words[i]} ${words[i + 1]}` : '';
    if (two && t2n.has(normalize(two))) {
      out.push({ word: two, meaning: t2n.get(normalize(two))! });
      i++;
      continue;
    }
    const one = t2n.get(normalize(words[i]));
    if (one) out.push({ word: words[i], meaning: one });
  }
  return out;
}

function sentenceFor(ex: Exercise): string | null {
  switch (ex.type) {
    case 'WORD_BANK':
    case 'TYPE_TRANSLATION':
      return ex.dir === 'toTarget' ? ex.answer : ex.prompt;
    case 'LISTENING_TAP':
      return ex.answer;
    case 'SPEAKING_REPEAT':
      return ex.phrase;
    case 'FILL_BLANK':
      return `${ex.before} ${ex.options[ex.correct]} ${ex.after}`.replace(/\s+/g, ' ').trim();
    case 'DIALOGUE_COMPLETE':
      return ex.options[ex.correct];
    default:
      return null;
  }
}

export function explainAnswer(ex: Exercise, g: Grade, course: Course): ExplainSection[] {
  const out: ExplainSection[] = [];
  const { t2n, n2t } = dictionaryFor(course);

  if (g.correct) {
    out.push({ title: 'Why this is right', body: `“${g.correctText}” is correct.${g.message ? ' ' + g.message : ''}` });
  } else {
    out.push({ title: 'What happened', body: `You answered “${g.userText || '(nothing)'}”. The correct answer is “${g.correctText}”.` });
  }

  if (ex.explain) out.push({ title: 'The rule', body: ex.explain });

  // why was the chosen option wrong?
  if (!g.correct && (ex.type === 'MULTIPLE_CHOICE' || ex.type === 'FILL_BLANK' || ex.type === 'DIALOGUE_COMPLETE') && g.userText) {
    const key = normalize(g.userText);
    const meaning = t2n.get(key) ?? n2t.get(key);
    if (meaning) out.push({ title: `Why “${g.userText}” does not fit`, body: `“${g.userText}” means “${meaning}”, which is not what this question asks for.` });
    else if (ex.type === 'FILL_BLANK') out.push({ title: `Why “${g.userText}” does not fit`, body: `Read the full sentence with your choice: “${ex.before} ${g.userText} ${ex.after}”. The grammar form does not match the rest of the sentence.` });
    else if (ex.type === 'DIALOGUE_COMPLETE') out.push({ title: `Why “${g.userText}” does not fit`, body: 'That reply does not answer the question that was asked. Check what the other person wants to know.' });
  }

  if (ex.type === 'FILL_BLANK') out.push({ title: 'Full sentence', body: `${ex.before} ${ex.options[ex.correct]} ${ex.after}`.replace(/\s+/g, ' ').trim() + `\n${ex.translation}` });
  if (ex.type === 'LISTENING_TAP') out.push({ title: 'Meaning', body: ex.translation });
  if (ex.type === 'SPEAKING_REPEAT') out.push({ title: 'Meaning', body: ex.translation });

  const s = sentenceFor(ex);
  if (s) {
    const gl = gloss(s, course);
    if (gl.length) out.push({ title: 'Word by word', body: gl.map((x) => `${x.word} = ${x.meaning}`).join('\n') });
  }
  return out;
}
