// Text-to-speech through the phone's own engine (zero cost, works offline once voice data is installed).
import * as Speech from 'expo-speech';

export const NORMAL_RATE = 0.95;
export const SLOW_RATE = 0.6;

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
}

export interface SpeakOptions {
  slow?: boolean;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
}

export function speak(text: string, lang: string, opts: SpeakOptions = {}): void {
  if (!text) {
    opts.onDone?.();
    return;
  }
  try {
    Speech.stop();
    Speech.speak(text, {
      language: lang,
      rate: opts.rate ?? (opts.slow ? SLOW_RATE : NORMAL_RATE),
      pitch: opts.pitch ?? 1.0,
      onStart: opts.onStart,
      onDone: opts.onDone,
      onStopped: opts.onDone,
      onError: opts.onDone,
    });
  } catch {
    opts.onDone?.();
  }
}

export function speakAsync(text: string, lang: string, opts: Omit<SpeakOptions, 'onDone'> = {}): Promise<void> {
  return new Promise((resolve) => speak(text, lang, { ...opts, onDone: () => resolve() }));
}

const voiceCache = new Map<string, boolean>();

/** true when the device has a TTS voice for this language (e.g. "ta-IN" for Tamil) */
export async function hasVoice(lang: string): Promise<boolean> {
  const code = lang.split(/[-_]/)[0].toLowerCase();
  if (voiceCache.has(code)) return voiceCache.get(code)!;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const ok = voices.some((v) => v.language.toLowerCase().replace('_', '-').startsWith(code));
    voiceCache.set(code, ok);
    return ok;
  } catch {
    return true; // unknown: do not block the learner
  }
}
