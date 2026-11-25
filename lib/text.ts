// Text normalisation + typo tolerance used by every answer checker.

const COMBINING = /[̀-ͯ]/g;

/** lower-case, strip accents (Latin only, Tamil vowel signs are kept), drop punctuation, collapse spaces */
export function normalize(input: string): string {
  let s = input.normalize('NFD');
  // Remove Latin combining accents only. Tamil vowel signs live in a different Unicode block and stay.
  s = s.replace(COMBINING, '');
  s = s.normalize('NFC').toLowerCase();
  s = s
    .replace(/[\u2018\u2019\u02bc`']/g, '') // I'm -> im, that's -> thats
    .replace(/["\u201c\u201d\u201e\u00ab\u00bb\u00bf\u00a1!?.,;:()\[\]{}\u2026\-\u2013\u2014_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/** kept for readability at call sites: apostrophes are already dropped by normalize */
export function loose(input: string): string {
  return normalize(input);
}

export function tokens(input: string): string[] {
  const n = normalize(input);
  return n.length ? n.split(' ') : [];
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const A = Array.from(a);
  const B = Array.from(b);
  if (!A.length) return B.length;
  if (!B.length) return A.length;
  let prev = new Array(B.length + 1);
  let cur = new Array(B.length + 1);
  for (let j = 0; j <= B.length; j++) prev[j] = j;
  for (let i = 1; i <= A.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[B.length];
}

/** how many character edits we forgive for a given answer length (0 for short answers) */
export function typoBudget(len: number): number {
  if (len < 5) return 0;
  if (len < 14) return 1;
  return 2;
}

export type TextMatch = 'exact' | 'accent' | 'typo' | 'wrong';

/** Compare a typed answer against the accepted answers. */
export function matchText(user: string, answers: string[]): { result: TextMatch; best: string } {
  const u = loose(user);
  let bestDist = Infinity;
  let best = answers[0] ?? '';
  for (const a of answers) {
    const na = loose(a);
    if (u === na) {
      const strict = user.trim().toLowerCase().replace(/[.!?¿¡]/g, '').trim() === a.toLowerCase().replace(/[.!?¿¡]/g, '').trim();
      return { result: strict ? 'exact' : 'accent', best: a };
    }
    const d = levenshtein(u, na);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  if (u.length > 0 && bestDist <= typoBudget(loose(best).length)) return { result: 'typo', best };
  return { result: 'wrong', best };
}

export function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function joinTokens(t: string[]): string {
  return t.join(' ');
}
