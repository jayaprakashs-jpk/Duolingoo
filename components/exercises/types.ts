import type { Grade } from '@/services/grading';

export interface ExProps<T> {
  ex: T;
  /** report the current answer (null = nothing chosen yet). `submit` grades immediately. */
  onAnswer: (answer: unknown, opts?: { submit?: boolean }) => void;
  locked: boolean;
  grade: Grade | null;
  onSkipSpeaking?: () => void;
  scrollToEnd?: () => void;
}
