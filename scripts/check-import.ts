// The Curriculum Studio importer must accept the template and the full seed specs (this is also what Supabase serves).
import { EN_FOR_TA_SPEC, ES_FOR_EN_SPEC } from '../data/seed';
import { courseExerciseCount } from '../data/builder';
import { IMPORT_TEMPLATE, parseCourseJson } from '../services/validate';

let fails = 0;
const t = parseCourseJson(IMPORT_TEMPLATE);
console.log('template:', t.errors.length ? t.errors : `ok, ${t.course!.units.length} unit(s), ${courseExerciseCount(t.course!)} exercises`);
if (t.errors.length) fails++;
for (const spec of [EN_FOR_TA_SPEC, ES_FOR_EN_SPEC]) {
  const r = parseCourseJson(JSON.stringify(spec));
  console.log(spec.id + ':', r.errors.length ? r.errors : `ok, ${courseExerciseCount(r.course!)} exercises`);
  if (r.errors.length) fails++;
}
// bad inputs must be rejected with readable messages
for (const [name, text] of [['not json', '{oops'], ['no units', '{}'], ['bad lesson', JSON.stringify({ id: 'x-y', title: 'T', native: { code: 'en', name: 'English' }, target: { code: 'fr', name: 'French' }, units: [{ title: 'U', lessons: [{ title: 'L', v: [['a', 'b']], s: [], fill: {}, dlg: {} }] }] })]] as const) {
  const r = parseCourseJson(text);
  console.log(`reject "${name}":`, r.errors.length ? 'ok -> ' + r.errors[0] : 'FAIL (accepted)');
  if (!r.errors.length) fails++;
}
process.exit(fails ? 1 : 0);
