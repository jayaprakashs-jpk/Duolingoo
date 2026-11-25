// Smoke tests for text matching, spaced repetition and the offline AI engines. Run: npx tsx scripts/check-engines.ts
import { SEED_COURSES } from '../data/seed';
import { matchText } from '../lib/text';
import { newRpState, rpStep, scoreRoleplay, ruleCallReply, findFixes, vocabUsed } from '../services/tutor-engine';
import { newSrs, updateSrs, strength } from '../services/srs';
import { buildBoard } from '../services/league';
import { questsForDay, friendQuest } from '../services/quests';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.error('FAIL', name, 'got', got, 'want', want); } else console.log('ok  ', name);
};

eq('exact', matchText('I drink water', ['I drink water']).result, 'exact');
eq('typo', matchText('I drink watr', ['I drink water']).result, 'typo');
eq('accent', matchText('Hola como estas', ['Hola, ¿cómo estás?']).result, 'accent');
eq('wrong', matchText('banana', ['I drink water']).result, 'wrong');
eq('contraction accepted', matchText("I'm Ravi", ['My name is Ravi', "I'm Ravi"]).result !== 'wrong', true);
eq('tamil exact', matchText('வணக்கம்', ['வணக்கம்']).result, 'exact');
eq('short word no typo budget', matchText('cat', ['car']).result, 'wrong');

const en = SEED_COURSES[0], es = SEED_COURSES[1];

// roleplay: full coffee run through
const coffee = en.roleplays.find((r) => r.id.endsWith('coffee'))!;
const st = newRpState();
for (const msg of ['Good morning!', 'I would like a coffee, please.', 'How much is the coffee?', 'I will have a sandwich.', 'Yes, that is all. Thank you.']) rpStep(coffee, st, msg);
eq('coffee goals done', st.done.sort(), ['confirm', 'greet', 'order', 'price', 'snack']);
const sc = scoreRoleplay(coffee, st);
console.log('coffee score', sc.accuracy, sc.fluency, sc.xp);
eq('coffee accuracy high', sc.accuracy >= 90, true);
const st2 = newRpState();
const r = rpStep(coffee, st2, 'blah blah');
eq('fallback on nonsense', r.hit, false);

// spanish hotel
const hotel = es.roleplays.find((r) => r.id.endsWith('hotel'))!;
const sh = newRpState();
for (const m of ['Buenas noches', 'Tengo una reserva', 'Me llamo Ravi Kumar', '¿A qué hora es el desayuno?', '¿Me da la llave, por favor?']) rpStep(hotel, sh, m);
eq('hotel goals done', sh.done.length, 5);

// video call tutor
const counts = { turn: 0, counts: {} as Record<number, number> };
console.log('call reply 1:', ruleCallReply(en.tutor, 'Hello!', counts).line.t);
console.log('call reply 2:', ruleCallReply(en.tutor, 'I like cricket and music', counts).line.t);
eq('call goodbye', ruleCallReply(en.tutor, 'bye see you', counts).goodbye, true);
eq('fix: me name', findFixes(en.tutor, 'me name is Ravi').length > 0, true);
eq('fix: she go', findFixes(en.tutor, 'she go to school').length > 0, true);
eq('no false fix', findFixes(en.tutor, 'My name is Ravi').length, 0);
eq('es fix yo es', findFixes(es.tutor, 'yo es Ravi').length > 0, true);
eq('vocab used', vocabUsed(en, ['I eat rice and drink water']).map((v) => v.t).sort(), ['I', 'eat', 'rice', 'water']);

// SRS
let s = newSrs(0); const t0 = 1_000_000_000_000;
s = updateSrs(s, true, t0); const a = strength(s, t0);
s = updateSrs(s, true, t0 + 86400000); s = updateSrs(s, true, t0 + 5 * 86400000);
eq('interval grows', s.interval > 3, true);
eq('strength decays', strength(s, t0 + 60 * 86400000) < strength(s, t0 + 5 * 86400000), true);
const w = updateSrs(s, false, t0 + 6 * 86400000);
eq('wrong resets reps', w.reps, 0);
void a;

// league + quests determinism
const b1 = buildBoard('2026-11-23', 2, 100, 'Me', [], 0.5), b2 = buildBoard('2026-11-23', 2, 100, 'Me', [], 0.5);
eq('board deterministic', b1.map((x) => x.name + x.xp), b2.map((x) => x.name + x.xp));
eq('board size', b1.length, 30);
eq('3 quests', questsForDay('2026-11-25').length, 3);
eq('friend quest sane', friendQuest('2026-11-23', 0, Date.now()).target, 250);

console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
