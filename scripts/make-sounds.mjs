// Synthesizes the app's sound effects as 16-bit mono WAV files. No dependencies.
// Run: node scripts/make-sounds.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 22050;
mkdirSync('assets/sounds', { recursive: true });

function tone(freq, dur, { type = 'sine', vol = 0.5, attack = 0.005, release = 0.08, slideTo } = {}) {
  const n = Math.floor(RATE * dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = slideTo ? freq + (slideTo - freq) * (i / n) : freq;
    phase += (2 * Math.PI * f) / RATE;
    let s;
    if (type === 'square') s = Math.sin(phase) > 0 ? 1 : -1;
    else if (type === 'saw') s = ((phase / Math.PI) % 2) - 1;
    else s = Math.sin(phase) + 0.25 * Math.sin(2 * phase);
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    out[i] = s * env * vol;
  }
  return out;
}
const concat = (...arrs) => {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
const silence = (d) => new Float32Array(Math.floor(RATE * d));
function write(name, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2);
  writeFileSync(`assets/sounds/${name}.wav`, buf);
  console.log('wrote', name, (buf.length / 1024).toFixed(1) + 'KB');
}

// correct: two rising notes (E5, B5)
write('correct', concat(tone(659.25, 0.11), tone(987.77, 0.26, { release: 0.2 })));
// wrong: low buzzy fall
write('wrong', concat(tone(220, 0.14, { type: 'square', vol: 0.3 }), tone(165, 0.28, { type: 'square', vol: 0.3, release: 0.2 })));
// tap: tiny blip
write('tap', tone(880, 0.05, { vol: 0.3, release: 0.03 }));
// complete: fanfare C-E-G-C
write('complete', concat(
  tone(523.25, 0.14), tone(659.25, 0.14), tone(783.99, 0.14),
  tone(1046.5, 0.5, { release: 0.4 }), silence(0.05),
  tone(783.99, 0.1, { vol: 0.3 }), tone(1046.5, 0.45, { vol: 0.35, release: 0.4 })
));
// heart lost: descending slide
write('heart', tone(500, 0.35, { slideTo: 150, vol: 0.4, release: 0.15 }));
// coin / gems
write('gem', concat(tone(1318.5, 0.07, { vol: 0.35 }), tone(1760, 0.18, { vol: 0.35, release: 0.14 })));
