// Speech-to-text through expo-speech-recognition (Android's built-in recognizer, Google speech services).
// Everything degrades gracefully: if recognition is missing, denied or fails, callers fall back to typing.
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

let availableCache: boolean | null = null;

export async function sttAvailable(): Promise<boolean> {
  if (availableCache !== null) return availableCache;
  try {
    availableCache = !!ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    availableCache = false;
  }
  return availableCache;
}

export interface ListenHandlers {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (reason: 'permission' | 'unavailable' | 'no-speech' | 'error') => void;
  onEnd?: () => void;
}

type Sub = { remove: () => void };
let subs: Sub[] = [];
let active = false;

function clearSubs() {
  for (const s of subs) {
    try {
      s.remove();
    } catch {
      /* ignore */
    }
  }
  subs = [];
}

export async function startListening(locale: string, h: ListenHandlers): Promise<boolean> {
  if (!(await sttAvailable())) {
    h.onError('unavailable');
    return false;
  }
  try {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      h.onError('permission');
      return false;
    }
    clearSubs();
    if (active) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* ignore */
      }
    }
    let delivered = false;
    let lastPartial = '';
    subs = [
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        const text = e.results?.[0]?.transcript ?? '';
        if (e.isFinal) {
          if (delivered) return;
          delivered = true;
          active = false;
          if (text) h.onFinal(text);
          else h.onError('no-speech');
        } else if (text) {
          lastPartial = text;
          h.onPartial?.(text);
        }
      }),
      ExpoSpeechRecognitionModule.addListener('error', (e) => {
        active = false;
        if (delivered || e.error === 'aborted') return;
        delivered = true;
        if (e.error === 'no-speech' || e.error === 'speech-timeout') h.onError('no-speech');
        else if (e.error === 'not-allowed') h.onError('permission');
        else if (e.error === 'service-not-allowed' || e.error === 'language-not-supported') h.onError('unavailable');
        else h.onError('error');
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        const was = active;
        active = false;
        if (!delivered && was) {
          delivered = true;
          // some recognizers end with only partial results: use the last one
          if (lastPartial) h.onFinal(lastPartial);
          else h.onError('no-speech');
        }
        h.onEnd?.();
        clearSubs();
      }),
    ];
    active = true;
    ExpoSpeechRecognitionModule.start({ lang: locale, interimResults: true, maxAlternatives: 1, continuous: false });
    return true;
  } catch {
    active = false;
    h.onError('error');
    return false;
  }
}

export async function stopListening(): Promise<void> {
  if (!active) return;
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    /* ignore */
  }
}

export async function cancelListening(): Promise<void> {
  try {
    if (active) ExpoSpeechRecognitionModule.abort();
  } catch {
    /* ignore */
  }
  active = false;
  clearSubs();
}
