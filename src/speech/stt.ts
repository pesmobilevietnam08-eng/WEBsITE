import { stopSpeak } from './tts';

interface SpeechRecognitionResultLike {
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

export interface SttCallbacks {
  readonly getBaseText: () => string;
  readonly onTranscript: (fullText: string) => void;
  readonly onStart?: () => void;
  readonly onEnd?: (reason: 'stopped' | 'idle' | 'blocked' | 'error') => void;
}

export interface SttController {
  stop: () => void;
  abort: () => void;
}

function getSttCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
  return typeof ctor === 'function' ? (ctor as SpeechRecognitionCtor) : null;
}

/**
 * Starts browser Web Speech API recognition ONLY after an explicit user click.
 * Preserves legacy continuous auto-restart behavior up to 4 silent cycles.
 */
export function startSpeechRecognition(callbacks: SttCallbacks): SttController | null {
  const Ctor = getSttCtor();
  if (!Ctor) return null;

  stopSpeak();

  let activeRec: SpeechRecognitionInstance | null = null;
  let stopped = false;
  let blocked = false;
  let idleCount = 0;

  let base = callbacks.getBaseText().trim();
  base = base ? `${base} ` : '';

  const launch = () => {
    if (stopped || blocked) return;
    const rec = new Ctor();
    activeRec = rec;
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    let gotResult = false;

    rec.onstart = () => {
      callbacks.onStart?.();
    };

    rec.onresult = (e) => {
      gotResult = true;
      idleCount = 0;
      let t = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res && res[0]) t += res[0].transcript;
      }
      callbacks.onTranscript(base + t);
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        blocked = true;
        stopped = true;
        callbacks.onEnd?.('blocked');
      }
    };

    rec.onend = () => {
      if (activeRec !== rec) return;
      if (!stopped && !blocked) {
        const latest = callbacks.getBaseText().trim();
        base = latest ? `${latest} ` : '';
        if (!gotResult) idleCount++;
        if (idleCount >= 4) {
          activeRec = null;
          callbacks.onEnd?.('idle');
          return;
        }
        window.setTimeout(() => {
          if (activeRec === rec && !stopped && !blocked) {
            try {
              launch();
            } catch {
              activeRec = null;
              callbacks.onEnd?.('error');
            }
          }
        }, 200);
        return;
      }
      activeRec = null;
      if (!blocked) {
        callbacks.onEnd?.('stopped');
      }
    };

    try {
      rec.start();
    } catch {
      activeRec = null;
      callbacks.onEnd?.('error');
    }
  };

  launch();

  return {
    stop() {
      stopped = true;
      try {
        activeRec?.stop();
      } catch {
        // ignore stop errors
      }
    },
    abort() {
      stopped = true;
      try {
        activeRec?.abort();
      } catch {
        // ignore abort errors
      }
      activeRec = null;
    },
  };
}
