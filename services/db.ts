// SQLite layer: offline unit packs, mistakes inbox, word mastery (SRS), imported courses and the sync queue.
import * as SQLite from 'expo-sqlite';
import type { Course, Exercise, Unit, VocabItem } from '@/data/types';
import { newSrs, strength, updateSrs, type SrsFields } from './srs';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('linguaspark.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS packs (
      unit_id TEXT PRIMARY KEY NOT NULL,
      course_id TEXT NOT NULL,
      json TEXT NOT NULL,
      audio_json TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      downloaded_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY NOT NULL,
      course_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      exercise_json TEXT NOT NULL,
      streak INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mistakes_course ON mistakes(course_id);
    CREATE TABLE IF NOT EXISTS words (
      key TEXT PRIMARY KEY NOT NULL,
      course_id TEXT NOT NULL,
      target TEXT NOT NULL,
      native TEXT NOT NULL,
      emoji TEXT,
      reps INTEGER NOT NULL DEFAULT 0,
      ease REAL NOT NULL DEFAULT 2.5,
      ivl REAL NOT NULL DEFAULT 0,
      due INTEGER NOT NULL DEFAULT 0,
      last_seen INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      wrong INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_words_course ON words(course_id);
    CREATE TABLE IF NOT EXISTS custom_courses (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      dedupe TEXT,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

// ------------------------------------------------------------------ packs
export interface AudioItem {
  text: string;
  lang: string;
}

export function audioManifest(unit: Unit, course: Course): AudioItem[] {
  const seen = new Set<string>();
  const out: AudioItem[] = [];
  const add = (text: string | undefined, lang: string) => {
    if (!text) return;
    const k = `${lang}|${text}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ text, lang });
  };
  for (const l of [...unit.lessons, unit.story]) {
    l.vocab.forEach((v) => add(v.t, course.ttsLocale));
    for (const e of l.exercises) {
      if (e.type === 'LISTENING_TAP') add(e.audio, course.ttsLocale);
      if (e.type === 'SPEAKING_REPEAT') add(e.phrase, course.ttsLocale);
      if (e.type === 'MULTIPLE_CHOICE') add(e.speak, course.ttsLocale);
      if (e.type === 'INTERACTIVE_STORY') e.parts.forEach((p) => add(p.text, course.ttsLocale));
    }
  }
  return out;
}

export async function savePack(unit: Unit, course: Course): Promise<{ bytes: number; audio: number }> {
  const db = await getDb();
  const json = JSON.stringify(unit);
  const audio = audioManifest(unit, course);
  await db.runAsync(
    'INSERT OR REPLACE INTO packs (unit_id, course_id, json, audio_json, bytes, downloaded_at) VALUES (?,?,?,?,?,?)',
    unit.id,
    course.id,
    json,
    JSON.stringify(audio),
    json.length,
    Date.now()
  );
  return { bytes: json.length, audio: audio.length };
}

export async function getPack(unitId: string): Promise<Unit | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM packs WHERE unit_id = ?', unitId);
  return row ? (JSON.parse(row.json) as Unit) : null;
}

export async function listPacks(): Promise<{ unitId: string; courseId: string; bytes: number; downloadedAt: number }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ unit_id: string; course_id: string; bytes: number; downloaded_at: number }>(
    'SELECT unit_id, course_id, bytes, downloaded_at FROM packs'
  );
  return rows.map((r) => ({ unitId: r.unit_id, courseId: r.course_id, bytes: r.bytes, downloadedAt: r.downloaded_at }));
}

export async function deletePack(unitId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM packs WHERE unit_id = ?', unitId);
}

// ------------------------------------------------------------------ custom courses
export async function saveCustomCourse(course: Course): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO custom_courses (id, json, created_at) VALUES (?,?,?)', course.id, JSON.stringify(course), Date.now());
}

export async function listCustomCourses(): Promise<Course[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ json: string }>('SELECT json FROM custom_courses ORDER BY created_at');
  const out: Course[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.json) as Course);
    } catch {
      /* skip corrupt row */
    }
  }
  return out;
}

export async function deleteCustomCourse(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_courses WHERE id = ?', id);
}

// ------------------------------------------------------------------ mistakes inbox
interface MistakeDbRow {
  id: string;
  course_id: string;
  lesson_id: string;
  exercise_json: string;
  streak: number;
  created_at: number;
}

export interface Mistake {
  id: string;
  courseId: string;
  lessonId: string;
  exercise: Exercise;
  streak: number;
  createdAt: number;
}

const toMistake = (r: MistakeDbRow): Mistake => ({
  id: r.id,
  courseId: r.course_id,
  lessonId: r.lesson_id,
  exercise: JSON.parse(r.exercise_json) as Exercise,
  streak: r.streak,
  createdAt: r.created_at,
});

/**
 * Called after every graded exercise.
 * Wrong -> (re)log it with a streak of 0. Right -> if it is in the inbox, count one clean answer;
 * two clean answers in a row remove it.
 */
export async function recordExercise(courseId: string, lessonId: string, ex: Exercise, correct: boolean): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  if (!correct) {
    await db.runAsync(
      `INSERT INTO mistakes (id, course_id, lesson_id, exercise_json, streak, created_at, last_at)
       VALUES (?,?,?,?,0,?,?)
       ON CONFLICT(id) DO UPDATE SET streak = 0, last_at = excluded.last_at, exercise_json = excluded.exercise_json`,
      ex.id,
      courseId,
      lessonId,
      JSON.stringify(ex),
      now,
      now
    );
    return;
  }
  const row = await db.getFirstAsync<{ streak: number }>('SELECT streak FROM mistakes WHERE id = ?', ex.id);
  if (!row) return;
  if (row.streak + 1 >= 2) await db.runAsync('DELETE FROM mistakes WHERE id = ?', ex.id);
  else await db.runAsync('UPDATE mistakes SET streak = streak + 1, last_at = ? WHERE id = ?', now, ex.id);
}

export async function getMistakes(courseId: string, limit = 10): Promise<Mistake[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MistakeDbRow>(
    'SELECT * FROM mistakes WHERE course_id = ? ORDER BY streak ASC, last_at DESC LIMIT ?',
    courseId,
    limit
  );
  return rows.map(toMistake);
}

export async function mistakeCount(courseId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM mistakes WHERE course_id = ?', courseId);
  return row?.n ?? 0;
}

// ------------------------------------------------------------------ words (spaced repetition)
interface WordDbRow {
  key: string;
  course_id: string;
  target: string;
  native: string;
  emoji: string | null;
  reps: number;
  ease: number;
  ivl: number;
  due: number;
  last_seen: number;
  correct: number;
  wrong: number;
}

export interface WordRow extends SrsFields {
  key: string;
  courseId: string;
  target: string;
  native: string;
  emoji?: string;
  mastery: number;
}

const wordKey = (courseId: string, target: string) => `${courseId}::${target}`;

const toWord = (r: WordDbRow, now: number): WordRow => {
  const s: SrsFields = { reps: r.reps, ease: r.ease, interval: r.ivl, due: r.due, lastSeen: r.last_seen, correct: r.correct, wrong: r.wrong };
  return { ...s, key: r.key, courseId: r.course_id, target: r.target, native: r.native, emoji: r.emoji ?? undefined, mastery: strength(s, now) };
};

/** Mark vocabulary as introduced (called when a lesson is completed). Existing rows are left alone. */
export async function introduceWords(courseId: string, vocab: VocabItem[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  for (const v of vocab) {
    const s = updateSrs(newSrs(now), true, now);
    await db.runAsync(
      `INSERT OR IGNORE INTO words (key, course_id, target, native, emoji, reps, ease, ivl, due, last_seen, correct, wrong)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      wordKey(courseId, v.t), courseId, v.t, v.n, v.e ?? null, s.reps, s.ease, s.interval, s.due, s.lastSeen, s.correct, s.wrong
    );
  }
}

export async function recordWord(courseId: string, target: string, correct: boolean, clean = true): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const key = wordKey(courseId, target);
  const row = await db.getFirstAsync<WordDbRow>('SELECT * FROM words WHERE key = ?', key);
  if (!row) return; // only words the learner has been introduced to
  const next = updateSrs({ reps: row.reps, ease: row.ease, interval: row.ivl, due: row.due, lastSeen: row.last_seen, correct: row.correct, wrong: row.wrong }, correct, now, clean);
  await db.runAsync(
    'UPDATE words SET reps=?, ease=?, ivl=?, due=?, last_seen=?, correct=?, wrong=? WHERE key=?',
    next.reps, next.ease, next.interval, next.due, next.lastSeen, next.correct, next.wrong, key
  );
}

export async function getWords(courseId: string): Promise<WordRow[]> {
  const db = await getDb();
  const now = Date.now();
  const rows = await db.getAllAsync<WordDbRow>('SELECT * FROM words WHERE course_id = ?', courseId);
  return rows.map((r) => toWord(r, now));
}

export async function weakestWords(courseId: string, n: number): Promise<WordRow[]> {
  const all = await getWords(courseId);
  return all.sort((a, b) => a.mastery - b.mastery || a.due - b.due).slice(0, n);
}

// ------------------------------------------------------------------ sync queue
export interface QueuedEvent {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
}

/** `dedupe` keeps only the newest event per key (e.g. one profile snapshot, one row per lesson). */
export async function enqueue(kind: string, payload: Record<string, unknown>, dedupe?: string): Promise<void> {
  const db = await getDb();
  if (dedupe) await db.runAsync('DELETE FROM sync_queue WHERE kind = ? AND dedupe = ?', kind, dedupe);
  await db.runAsync('INSERT INTO sync_queue (kind, dedupe, payload, created_at) VALUES (?,?,?,?)', kind, dedupe ?? null, JSON.stringify(payload), Date.now());
}

export async function peekQueue(limit = 100): Promise<QueuedEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; kind: string; payload: string }>('SELECT id, kind, payload FROM sync_queue ORDER BY id LIMIT ?', limit);
  return rows.map((r) => ({ id: r.id, kind: r.kind, payload: JSON.parse(r.payload) as Record<string, unknown> }));
}

export async function deleteQueued(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

export async function queueSize(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue');
  return row?.n ?? 0;
}

export async function resetLearningData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM mistakes; DELETE FROM words; DELETE FROM packs; DELETE FROM sync_queue;');
}
