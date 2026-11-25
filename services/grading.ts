// Pure answer checking for every exercise type.
import type { Exercise } from '@/data/types';
import { levenshtein, loose, matchText, normalize } from '@/lib/text';

export interface SpeakDiff {
  word: string;
  ok: boolean;
}

export interface Grade {
  correct: boolean;
  /** correct but with a typo / missing accent */
  almost?: boolean;
  /** should the runner ask this exercise again later */
  requeue: boolean;
  /** does a wrong answer cost a heart */
  costsHeart: boolean;
  userText: string;
  correctText: string;
  message?: string;
  diff?: SpeakDiff[];
  accuracy?: number;
}

export type MatchAnswer = { errors: number };
export type StoryAnswer = { score: number; total: number };
export type TimedAnswer = { score: number; total: number; seconds: number };

function tileMatch(userTokens: string[], answers: string[]): boolean {
  const u = loose(userTokens.join(' '));
  return answers.some((a) => loose(a) === u);
}

export function speakingDiff(phrase: string, transcript: string): { diff: SpeakDiff[]; accuracy: number } {
  const target = phrase.split(/\s+/).filter(Boolean);
  const heard = normalize(transcript).split(' ').filter(Boolean);
  const pool = heard.slice();
  const diff: SpeakDiff[] = target.map((word) => {
    const nw = normalize(word);
    let idx = pool.indexOf(nw);
    if (idx < 0 && nw.length >= 5) idx = pool.findIndex((h) => levenshtein(h, nw) <= 1);
    if (idx >= 0) {
      pool.splice(idx, 1);
      return { word, ok: true };
    }
    return { word, ok: false };
  });
  const okCount = diff.filter((d) => d.ok).length;
  return { diff, accuracy: target.length ? okCount / target.length : 0 };
}

export function grade(ex: Exercise, answer: unknown): Grade {
  switch (ex.type) {
    case 'WORD_BANK':
    case 'LISTENING_TAP': {
      const toks = (answer as string[]) ?? [];
      const ok = tileMatch(toks, [ex.answer, ...(ex.accept ?? [])]);
      return { correct: ok, requeue: !ok, costsHeart: true, userText: toks.join(' '), correctText: ex.answer };
    }
    case 'TYPE_TRANSLATION': {
      const typed = String(answer ?? '');
      const { result, best } = matchText(typed, [ex.answer, ...(ex.accept ?? [])]);
      const ok = result !== 'wrong';
      let message: string | undefined;
      if (result === 'typo') message = 'Almost! Watch your spelling.';
      if (result === 'accent') message = 'Right. Mind the accents next time.';
      return { correct: ok, almost: result === 'typo' || result === 'accent', requeue: !ok, costsHeart: true, userText: typed, correctText: ok ? best : ex.answer, message };
    }
    case 'MULTIPLE_CHOICE': {
      const i = answer as number;
      return { correct: i === ex.correct, requeue: i !== ex.correct, costsHeart: true, userText: ex.options[i]?.text ?? '', correctText: ex.options[ex.correct].text };
    }
    case 'FILL_BLANK': {
      const i = answer as number;
      return { correct: i === ex.correct, requeue: i !== ex.correct, costsHeart: true, userText: ex.options[i] ?? '', correctText: ex.options[ex.correct] };
    }
    case 'DIALOGUE_COMPLETE': {
      const i = answer as number;
      return { correct: i === ex.correct, requeue: i !== ex.correct, costsHeart: true, userText: ex.options[i] ?? '', correctText: ex.options[ex.correct] };
    }
    case 'SPEAKING_REPEAT': {
      const transcript = String(answer ?? '');
      const { diff, accuracy } = speakingDiff(ex.phrase, transcript);
      const ok = accuracy >= 0.7;
      return {
        correct: ok,
        requeue: false,
        costsHeart: false,
        userText: transcript,
        correctText: ex.phrase,
        diff,
        accuracy,
        message: ok ? (accuracy < 1 ? 'Good! A few words were off.' : 'Perfect pronunciation!') : 'Not quite. Listen again and try once more next time.',
      };
    }
    case 'MATCH_PAIRS': {
      const { errors } = answer as MatchAnswer;
      return { correct: errors === 0, requeue: false, costsHeart: true, userText: errors ? `${errors} wrong tap${errors > 1 ? 's' : ''}` : 'No mistakes', correctText: 'All pairs matched', message: errors ? 'You matched them all, but with some wrong taps.' : undefined };
    }
    case 'INTERACTIVE_STORY': {
      const { score, total } = answer as StoryAnswer;
      const ok = total === 0 || score / total >= 0.5;
      return { correct: ok, requeue: false, costsHeart: false, userText: `${score}/${total} questions right`, correctText: `${total}/${total}`, accuracy: total ? score / total : 1 };
    }
    case 'TIMED_CHALLENGE': {
      const a = answer as TimedAnswer;
      return { correct: true, requeue: false, costsHeart: false, userText: `${a.score} matches`, correctText: `${a.score} matches`, accuracy: 1 };
    }
  }
}

/** What to say out loud when the answer is revealed (target-language text). */
export function speakableAnswer(ex: Exercise): string | null {
  switch (ex.type) {
    case 'WORD_BANK':
      return ex.dir === 'toTarget' ? ex.answer : ex.prompt;
    case 'TYPE_TRANSLATION':
      return ex.dir === 'toTarget' ? ex.answer : ex.prompt;
    case 'LISTENING_TAP':
      return ex.audio;
    case 'SPEAKING_REPEAT':
      return ex.phrase;
    case 'FILL_BLANK':
      return `${ex.before} ${ex.options[ex.correct]} ${ex.after}`.replace(/\s+/g, ' ').trim();
    case 'DIALOGUE_COMPLETE':
      return ex.options[ex.correct];
    case 'MULTIPLE_CHOICE':
      return ex.speak ?? null;
    default:
      return null;
  }
}
