// SM-2 style spaced repetition with a strength-decay curve for the "mastery" bars.
export interface SrsFields {
  reps: number;
  ease: number;
  /** interval in days */
  interval: number;
  due: number;
  lastSeen: number;
  correct: number;
  wrong: number;
}

export const newSrs = (now: number): SrsFields => ({ reps: 0, ease: 2.5, interval: 0, due: now, lastSeen: 0, correct: 0, wrong: 0 });

const DAY = 86400000;

/** quality 0..5. We use 5 for a clean correct answer, 4 for correct after a retry, 1 for wrong. */
export function updateSrs(s: SrsFields, correct: boolean, now: number, clean = true): SrsFields {
  const q = correct ? (clean ? 5 : 4) : 1;
  let { reps, ease, interval } = s;
  if (q < 3) {
    reps = 0;
    interval = 0.25; // review again in ~6 hours
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * ease * 10) / 10;
    reps += 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return {
    reps,
    ease,
    interval,
    due: now + interval * DAY,
    lastSeen: now,
    correct: s.correct + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
  };
}

/** 0..1. Halves when a word is exactly due; new words start low. */
export function strength(s: SrsFields, now: number): number {
  if (!s.lastSeen) return 0;
  const half = Math.max(0.25, s.interval) * DAY;
  const retention = Math.pow(0.5, Math.max(0, now - s.lastSeen) / half);
  const confidence = Math.min(1, 0.3 + s.reps * 0.14);
  return Math.max(0, Math.min(1, retention * confidence));
}
