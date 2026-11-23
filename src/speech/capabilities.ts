export interface SpeechCapabilities {
  readonly inAppBrowser: boolean;
  readonly isMobile: boolean;
  readonly hasTTS: boolean;
  readonly hasSTT: boolean;
}

const IN_APP_RX =
  /(Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|TikTok|Twitter|KAKAOTALK)/i;

export function detectSpeechCapabilities(): SpeechCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { inAppBrowser: false, isMobile: false, hasTTS: false, hasSTT: false };
  }
  const ua = navigator.userAgent || '';
  const inAppBrowser = IN_APP_RX.test(ua);
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  const hasTTS = 'speechSynthesis' in window;
  const win = window as unknown as Record<string, unknown>;
  const hasSTT = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);

  return { inAppBrowser, isMobile, hasTTS, hasSTT };
}
