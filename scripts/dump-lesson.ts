import { writeFileSync } from 'node:fs';
import { SEED_COURSES } from '../data/seed';
const out: Record<string, unknown> = {};
for (const c of SEED_COURSES) for (const u of c.units) for (const l of [...u.lessons, u.story, u.timed]) out[l.id] = l.exercises;
writeFileSync(process.argv[2], JSON.stringify(out));
