// Runs the REAL services/db.ts against Node's built-in SQLite through a tiny expo-sqlite shim.
// Run: npx tsx scripts/check-db.ts   (needs Node 22.5+)
import Module from 'node:module';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

const fake = {
  openDatabaseAsync: async () => {
    const db = new DatabaseSync(':memory:');
    const flat = (p: unknown[]) => (p.length === 1 && Array.isArray(p[0]) ? (p[0] as unknown[]) : p);
    return {
      execAsync: async (sql: string) => db.exec(sql),
      runAsync: async (sql: string, ...p: unknown[]) => { const r = db.prepare(sql).run(...flat(p)); return { changes: r.changes, lastInsertRowId: r.lastInsertRowid }; },
      getFirstAsync: async (sql: string, ...p: unknown[]) => db.prepare(sql).get(...flat(p)) ?? null,
      getAllAsync: async (sql: string, ...p: unknown[]) => db.prepare(sql).all(...flat(p)),
    };
  },
};
const M = Module as unknown as { _load: (...a: unknown[]) => unknown };
const orig = M._load;
M._load = function (req: unknown, ...rest: unknown[]) {
  if (req === 'expo-sqlite') return fake;
  return orig.call(this, req, ...rest);
};

let fails = 0;
const eq = (n: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.error('FAIL', n, 'got', got, 'want', want); } else console.log('ok  ', n);
};

async function main() {
  const db = await import('../services/db');
  const { SEED_COURSES } = await import('../data/seed');
  const course = SEED_COURSES[0];
  const ex = course.units[0].lessons[0].exercises[0];

  // mistakes inbox: wrong -> logged, 2 clean answers in a row -> cleared
  await db.recordExercise(course.id, 'l1', ex, false);
  eq('mistake logged', await db.mistakeCount(course.id), 1);
  await db.recordExercise(course.id, 'l1', ex, true);
  eq('still there after 1 right', await db.mistakeCount(course.id), 1);
  await db.recordExercise(course.id, 'l1', ex, false);
  await db.recordExercise(course.id, 'l1', ex, true);
  eq('wrong resets streak (still there)', await db.mistakeCount(course.id), 1);
  await db.recordExercise(course.id, 'l1', ex, true);
  eq('cleared after 2 in a row', await db.mistakeCount(course.id), 0);
  await db.recordExercise(course.id, 'l1', ex, true);
  eq('right answer on unknown exercise is a no-op', await db.mistakeCount(course.id), 0);
  await db.recordExercise(course.id, 'l1', ex, false);
  const ms = await db.getMistakes(course.id, 10);
  eq('mistake round-trips as exercise JSON', ms[0].exercise.id, ex.id);

  // words + SRS
  const vocab = course.units[0].lessons[0].vocab;
  await db.introduceWords(course.id, vocab);
  await db.introduceWords(course.id, vocab); // idempotent
  const words = await db.getWords(course.id);
  eq('words introduced once', words.length, vocab.length);
  const before = words.find((w) => w.target === 'Hello')!;
  await db.recordWord(course.id, 'Hello', false);
  const after = (await db.getWords(course.id)).find((w) => w.target === 'Hello')!;
  eq('wrong answer lowers mastery', after.mastery <= before.mastery, true);
  eq('wrong counted', after.wrong, 1);
  const weak = await db.weakestWords(course.id, 2);
  eq('weakest first is Hello', weak[0].target, 'Hello');
  await db.recordWord(course.id, 'NotLearnedYet', true); // must be ignored
  eq('unlearned word ignored', (await db.getWords(course.id)).length, vocab.length);

  // packs
  const unit = course.units[0];
  const r = await db.savePack(unit, course);
  eq('pack has audio manifest', r.audio > 10, true);
  const back = await db.getPack(unit.id);
  eq('pack round-trips', back?.lessons.length, unit.lessons.length);
  eq('listPacks', (await db.listPacks()).length, 1);
  await db.deletePack(unit.id);
  eq('pack deleted', await db.getPack(unit.id), null);

  // custom courses
  await db.saveCustomCourse({ ...course, id: 'x-custom', builtin: false });
  eq('custom course listed', (await db.listCustomCourses()).map((c) => c.id), ['x-custom']);
  await db.deleteCustomCourse('x-custom');
  eq('custom course deleted', (await db.listCustomCourses()).length, 0);

  // sync queue: dedupe keeps newest only
  await db.enqueue('profile', { xp: 1 }, 'profile');
  await db.enqueue('profile', { xp: 2 }, 'profile');
  await db.enqueue('progress', { l: 1 }, 'progress:a');
  const q = await db.peekQueue();
  eq('queue deduped', q.map((e) => `${e.kind}:${JSON.stringify(e.payload)}`), ['profile:{"xp":2}', 'progress:{"l":1}']);
  await db.deleteQueued([q[0].id]);
  eq('queue delete', await db.queueSize(), 1);
  await db.resetLearningData();
  eq('reset clears', [await db.queueSize(), await db.mistakeCount(course.id), (await db.getWords(course.id)).length], [0, 0, 0]);

  console.log(fails ? `${fails} FAILED` : 'ALL OK');
  process.exit(fails ? 1 : 0);
}
void main();
