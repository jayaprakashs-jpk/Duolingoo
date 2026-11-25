// Guards against the Android bug where NativeWind drops function-style Pressables (invisible buttons).
// App code must use <Press> from components/ui/Press, never Pressable from react-native, and never a style function.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['app', 'components'];
const allowed = new Set(['components/ui/Press.tsx']);
const bad: string[] = [];

function walk(dir: string) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') && !allowed.has(p)) check(p);
  }
}
function check(p: string) {
  const src = readFileSync(p, 'utf8');
  if (/import\s*\{[^}]*\bPressable\b[^}]*\}\s*from\s*'react-native'/.test(src)) bad.push(`${p}: imports Pressable from react-native (use Press)`);
  if (/style=\{\s*\(\s*\{?\s*pressed/.test(src) && !/<Press\b/.test(src)) bad.push(`${p}: style function without <Press>`);
  if (/style=\{\s*function/.test(src)) bad.push(`${p}: style={function ...}`);
}
roots.forEach(walk);
if (bad.length) {
  console.error('FAIL\n' + bad.join('\n'));
  process.exit(1);
}
console.log('ok: no direct Pressable imports or bare style functions in app/ and components/');
