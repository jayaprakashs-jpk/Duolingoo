// Core data model. Everything the learning engine needs is plain JSON so it can be
// bundled, cached in SQLite, imported from the Studio, or stored in Supabase.

export type Tier = 'free' | 'super' | 'family' | 'max';

export interface VocabItem {
  /** target-language word/phrase */
  t: string;
  /** native-language meaning */
  n: string;
  /** optional emoji used on picture cards */
  e?: string;
}

interface Base {
  id: string;
  /** vocab keys (target words) this exercise trains; feeds spaced repetition */
  focus?: string[];
  /** grammar note shown by "Explain my answer" */
  explain?: string;
}

export interface WordBankEx extends Base {
  type: 'WORD_BANK';
  prompt: string;
  /** toTarget: prompt is native, tiles are target. toNative: prompt is target, tiles are native. */
  dir: 'toTarget' | 'toNative';
  answer: string;
  bank: string[];
  accept?: string[];
}

export interface TypeTranslationEx extends Base {
  type: 'TYPE_TRANSLATION';
  prompt: string;
  dir: 'toTarget' | 'toNative';
  answer: string;
  accept?: string[];
}

export interface Option {
  text: string;
  emoji?: string;
}

export interface MultipleChoiceEx extends Base {
  type: 'MULTIPLE_CHOICE';
  prompt: string;
  /** if set, a speaker button plays this target-language text */
  speak?: string;
  promptEmoji?: string;
  options: Option[];
  correct: number;
}

export interface ListeningTapEx extends Base {
  type: 'LISTENING_TAP';
  audio: string;
  answer: string;
  bank: string[];
  translation: string;
  accept?: string[];
}

export interface SpeakingRepeatEx extends Base {
  type: 'SPEAKING_REPEAT';
  phrase: string;
  translation: string;
}

export interface Pair {
  /** target-language side */
  l: string;
  /** native-language side */
  r: string;
}

export interface MatchPairsEx extends Base {
  type: 'MATCH_PAIRS';
  pairs: Pair[];
  /** optional countdown in seconds (countdown mode) */
  countdown?: number;
}

export interface FillBlankEx extends Base {
  type: 'FILL_BLANK';
  before: string;
  after: string;
  options: string[];
  correct: number;
  translation: string;
}

export interface DialogueEx extends Base {
  type: 'DIALOGUE_COMPLETE';
  lines: { who: 'A' | 'B'; text: string }[];
  options: string[];
  correct: number;
  translation?: string;
}

export interface CastMember {
  id: string;
  name: string;
  emoji: string;
}

export interface StoryEx extends Base {
  type: 'INTERACTIVE_STORY';
  title: string;
  cast: CastMember[];
  parts: { who: string; text: string; tr: string }[];
  questions: { after: number; q: string; options: string[]; correct: number }[];
}

export interface TimedEx extends Base {
  type: 'TIMED_CHALLENGE';
  mode: 'match_madness' | 'ramp_up';
  seconds: number;
  pairs: Pair[];
}

export type Exercise =
  | WordBankEx
  | TypeTranslationEx
  | MultipleChoiceEx
  | ListeningTapEx
  | SpeakingRepeatEx
  | MatchPairsEx
  | FillBlankEx
  | DialogueEx
  | StoryEx
  | TimedEx;

export type ExerciseType = Exercise['type'];

export type LessonKind = 'lesson' | 'story' | 'timed';

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  kind: LessonKind;
  vocab: VocabItem[];
  exercises: Exercise[];
}

export interface GuideTip {
  title: string;
  body: string;
  examples?: { t: string; n: string }[];
}

export interface Guidebook {
  intro: string;
  tips: GuideTip[];
}

export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  color: string;
  dark: string;
  guidebook: Guidebook;
  lessons: Lesson[];
  story: Lesson;
  timed: Lesson;
  roleplayIds: string[];
}

export interface RoleplayStep {
  /** goal id this step completes (optional for generic small-talk steps) */
  goal?: string;
  /** any of these words/phrases (normalized) triggers the step */
  keys: string[];
  reply: string;
  tr: string;
  /** a model phrase shown in grading as "better phrasing" */
  better?: string;
}

export interface Roleplay {
  id: string;
  title: string;
  emoji: string;
  level: string;
  setting: string;
  persona: { name: string; role: string; emoji: string };
  goals: { id: string; text: string }[];
  opener: { text: string; tr: string };
  steps: RoleplayStep[];
  fallbacks: { text: string; tr: string }[];
  hints: string[];
  closing: { text: string; tr: string };
}

export interface TutorTopic {
  keys: string[];
  replies: { t: string; n: string }[];
}

export interface TutorFix {
  /** regex source, matched case-insensitively against the learner's sentence */
  re: string;
  hint: string;
  better: string;
}

export interface TutorKit {
  openers: { t: string; n: string }[];
  topics: TutorTopic[];
  fallbacks: { t: string; n: string }[];
  fixes: TutorFix[];
  closers: { t: string; n: string }[];
}

export interface Persona {
  name: string;
  emoji: string;
  color: string;
  role: string;
}

export interface Course {
  id: string;
  title: string;
  flag: string;
  nativeLang: string;
  targetLang: string;
  nativeName: string;
  targetName: string;
  /** locale for speech recognition of the target language */
  sttLocale: string;
  /** locale for text-to-speech of the target language */
  ttsLocale: string;
  /** locale for text-to-speech of the native language */
  nativeTts: string;
  persona: Persona;
  units: Unit[];
  roleplays: Roleplay[];
  tutor: TutorKit;
  builtin?: boolean;
}

// ---------------------------------------------------------------------------
// Compact authoring format (used by the seed data AND the Curriculum Studio).
// ---------------------------------------------------------------------------

export type VocabSpec = [t: string, n: string, e?: string];
export type SentenceSpec = [t: string, n: string, note?: string];

export interface LessonSpec {
  title: string;
  icon: string;
  tip: string;
  v: VocabSpec[];
  s: SentenceSpec[];
  fill: { before: string; after: string; opts: string[]; ans: number; tr: string; note?: string };
  dlg: { lines: string[]; opts: string[]; ans: number; tr?: string; note?: string };
}

export interface StorySpec {
  title: string;
  cast: CastMember[];
  parts: [who: string, text: string, tr: string][];
  questions: { after: number; q: string; opts: string[]; ans: number }[];
}

export type UnitTheme = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'teal';

export interface UnitSpec {
  title: string;
  subtitle: string;
  section: string;
  theme: UnitTheme;
  intro: string;
  tips: GuideTip[];
  lessons: LessonSpec[];
  story: StorySpec;
  roleplays: string[];
}

export interface CourseSpec {
  id: string;
  title: string;
  flag: string;
  native: { code: string; name: string; tts: string };
  target: { code: string; name: string; tts: string; stt: string };
  persona: Persona;
  units: UnitSpec[];
  roleplays?: Roleplay[];
  tutor?: TutorKit;
}
