function splitSpokenQuestionLocal(text: string): string[] {
  return String(text)
    .replace(/[「」]/g, '')
    .split(/(?<=[。？?])/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const trimmed = x.replace(/[。？?]+$/, '');
      return /か$/.test(trimmed) ? `${trimmed}？` : `${trimmed}。`;
    });
}

export interface VoiceInfo {
  readonly voiceURI: string;
  readonly name: string;
  readonly lang: string;
  readonly localService: boolean;
  readonly raw: SpeechSynthesisVoice;
}

export interface SpeakSeqOptions {
  readonly slow?: boolean;
  readonly voiceURI?: string | null;
  readonly onStart?: (sentenceIndex: number) => void;
  readonly onEnd?: (completed: boolean) => void;
}

let speakToken = 0;

export function voiceScore(v: Pick<SpeechSynthesisVoice, 'name' | 'localService'>): number {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (/online|natural|neural/.test(n)) s += 60;
  if (/nanami|keita|aoi|mayu|daichi|naoki|shiori/.test(n)) s += 15;
  if (/google/.test(n)) s += 40;
  if (/premium|enhanced|siri/.test(n)) s += 35;
  if (/kyoko|otoya|o-ren|hattori/.test(n)) s += 10;
  if (/haruka|ayumi|ichiro|sayaka|zira/.test(n)) s -= 5;
  if (!v.localService) s += 5;
  return s;
}

export function getJapaneseVoices(): VoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis
      .getVoices()
      .filter((v) => /^ja/i.test(v.lang))
      .sort((a, b) => voiceScore(b) - voiceScore(a))
      .map((raw) => ({
        voiceURI: raw.voiceURI,
        name: raw.name,
        lang: raw.lang,
        localService: raw.localService,
        raw,
      }));
  } catch {
    return [];
  }
}

export function pickVoice(
  voices: readonly VoiceInfo[],
  preferredURI: string | null | undefined,
): VoiceInfo | null {
  if (voices.length === 0) return null;
  if (preferredURI) {
    const match = voices.find((v) => v.voiceURI === preferredURI);
    if (match) return match;
  }
  return voices[0] ?? null;
}

export function stopSpeak(): void {
  speakToken++;
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore speechSynthesis cancel issues
  }
}

export function speakSeq(sents: readonly string[], options: SpeakSeqOptions = {}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  if (sents.length === 0) return false;

  stopSpeak();
  const tok = speakToken;
  const voices = getJapaneseVoices();
  const chosen = pickVoice(voices, options.voiceURI);
  const slow = Boolean(options.slow);
  let i = 0;

  const next = () => {
    if (tok !== speakToken) return;
    if (i >= sents.length) {
      options.onEnd?.(true);
      return;
    }
    const idx = i++;
    const text = sents[idx] ?? '';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (chosen) u.voice = chosen.raw;
    u.rate = slow ? 0.68 : 0.88;
    u.pitch = 1;
    u.onstart = () => {
      if (tok === speakToken) options.onStart?.(idx);
    };
    u.onend = () => {
      if (tok === speakToken) {
        window.setTimeout(next, idx < sents.length - 1 ? (slow ? 500 : 300) : 0);
      }
    };
    u.onerror = (e) => {
      if (tok === speakToken && e.error !== 'interrupted' && e.error !== 'canceled') {
        options.onEnd?.(false);
      }
    };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      options.onEnd?.(false);
    }
  };

  window.setTimeout(next, 80);
  return true;
}

export function speakQuestion(
  text: string,
  options: Omit<SpeakSeqOptions, 'onStart'> = {},
): boolean {
  return speakSeq(splitSpokenQuestionLocal(text), options);
}
