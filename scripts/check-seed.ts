// Sanity checks for the bundled curriculum. Run: npx tsx scripts/check-seed.ts
import { SEED_COURSES } from '../data/seed';
import { courseExerciseCount } from '../data/builder';
import { validateCourse } from '../services/validate';

let problems = 0;
const fail = (m: string) => { problems++; console.error('FAIL', m); };
const counts: Record<string, number> = {};
let total = 0;

for (const c of SEED_COURSES) {
  const errs = validateCourse(c);
  errs.forEach((e) => fail(`${c.id}: ${e}`));
  console.log(`${c.id}: ${c.units.length} units, ${c.units.reduce((n, u) => n + u.lessons.length, 0)} lessons, ${courseExerciseCount(c)} exercises, ${c.roleplays.length} roleplays`);
  total += courseExerciseCount(c);
  for (const u of c.units) {
    for (const l of [...u.lessons, u.story, u.timed]) for (const e of l.exercises) counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
}
console.log('by type', counts);
console.log('TOTAL exercises', total);
if (total < 150) fail('fewer than 150 exercises');
for (const t of ['WORD_BANK','TYPE_TRANSLATION','MULTIPLE_CHOICE','LISTENING_TAP','SPEAKING_REPEAT','MATCH_PAIRS','FILL_BLANK','DIALOGUE_COMPLETE','INTERACTIVE_STORY','TIMED_CHALLENGE']) if (!counts[t]) fail('missing type ' + t);
process.exit(problems ? 1 : 0);
