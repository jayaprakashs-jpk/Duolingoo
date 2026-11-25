// For every bundled exercise: the correct answer must pass and a deliberately wrong one must fail.
// Run: npx tsx scripts/check-grading.ts
import { SEED_COURSES } from '../data/seed';
import type { Exercise } from '../data/types';
import { grade } from '../services/grading';

function correctAnswer(e: Exercise): unknown {
  switch (e.type) {
    case 'WORD_BANK': case 'LISTENING_TAP': return e.answer.split(' ');
    case 'TYPE_TRANSLATION': return e.answer;
    case 'MULTIPLE_CHOICE': case 'FILL_BLANK': case 'DIALOGUE_COMPLETE': return e.correct;
    case 'SPEAKING_REPEAT': return e.phrase;
    case 'MATCH_PAIRS': return { errors: 0 };
    case 'INTERACTIVE_STORY': return { score: e.questions.length, total: e.questions.length };
    case 'TIMED_CHALLENGE': return { score: 5, total: 5, seconds: 90 };
  }
}
function wrongAnswer(e: Exercise): unknown {
  switch (e.type) {
    case 'WORD_BANK': case 'LISTENING_TAP': return e.answer.split(' ').reverse().concat('zzz');
    case 'TYPE_TRANSLATION': return 'completely wrong answer here';
    case 'MULTIPLE_CHOICE': case 'FILL_BLANK': case 'DIALOGUE_COMPLETE': return (e.correct + 1) % e.options.length;
    case 'SPEAKING_REPEAT': return 'banana';
    case 'MATCH_PAIRS': return { errors: 2 };
    case 'INTERACTIVE_STORY': return { score: 0, total: e.questions.length };
    case 'TIMED_CHALLENGE': return null;
  }
}
let bad = 0, n = 0;
for (const c of SEED_COURSES)
  for (const u of c.units)
    for (const l of [...u.lessons, u.story, u.timed])
      for (const e of l.exercises) {
        n++;
        const ok = grade(e, correctAnswer(e));
        if (!ok.correct) { bad++; console.error('CORRECT ANSWER REJECTED', e.id, e.type, ok); }
        if (e.type !== 'TIMED_CHALLENGE') {
          const no = grade(e, wrongAnswer(e));
          if (no.correct) { bad++; console.error('WRONG ANSWER ACCEPTED', e.id, e.type); }
        }
      }
console.log(`checked ${n} exercises, ${bad} problems`);
process.exit(bad ? 1 : 0);
