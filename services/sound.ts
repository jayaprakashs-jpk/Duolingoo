// Sound effects (expo-av) and haptics. All calls are fire-and-forget and never throw.
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const SOURCES = {
  correct: require('../assets/sounds/correct.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
  tap: require('../assets/sounds/tap.wav'),
  complete: require('../assets/sounds/complete.wav'),
  heart: require('../assets/sounds/heart.wav'),
  gem: require('../assets/sounds/gem.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const cache = new Map<SoundName, Audio.Sound>();
let soundOn = true;
let hapticsOn = true;
let inited = false;

export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
}

export async function initAudio(): Promise<void> {
  if (inited) return;
  inited = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    /* ignore */
  }
}

export async function play(name: SoundName): Promise<void> {
  if (!soundOn) return;
  try {
    let s = cache.get(name);
    if (!s) {
      const { sound } = await Audio.Sound.createAsync(SOURCES[name]);
      s = sound;
      cache.set(name, s);
    }
    await s.replayAsync();
  } catch {
    /* ignore */
  }
}

export function haptic(kind: 'success' | 'error' | 'light' | 'warning'): void {
  if (!hapticsOn) return;
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* ignore */
  }
}
