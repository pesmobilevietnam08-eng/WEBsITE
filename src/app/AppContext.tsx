import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { sanitizeLearnerName } from '../lib/sanitize';
import {
  detectSpeechCapabilities,
  getJapaneseVoices,
  pickVoice,
  type SpeechCapabilities,
  type VoiceInfo,
} from '../speech';
import {
  clearAllUserData,
  createDefaultState,
  loadStorageState,
  recordExamAttempt,
  recordFreeAttempt,
  recordPicAttempt,
  recordReadAttempt,
  saveStorageState,
  type ExamRecord,
  type StorageV3,
  type UserSettings,
} from '../storage';
import { registerPwaServiceWorker, type PwaUpdateHandle } from './pwa';

type Action =
  | { type: 'SET_NAME'; name: string }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<UserSettings> }
  | { type: 'REPLACE_STATE'; state: StorageV3 }
  | {
      type: 'RECORD_PIC';
      questionId: string;
      score15: number;
      percent: number;
      input: string;
      codes: readonly string[];
    }
  | {
      type: 'RECORD_FREE';
      questionId: string;
      passedChecks: number;
      totalChecks: number;
      input: string;
    }
  | {
      type: 'RECORD_READ';
      passageId: string;
      totalPct: number;
      breakdown: { h: number; k: number; i: number };
      input: string;
    }
  | { type: 'RECORD_EXAM'; record: ExamRecord }
  | { type: 'RESET_ALL' };

function reducer(state: StorageV3, action: Action): StorageV3 {
  switch (action.type) {
    case 'SET_NAME':
      return {
        ...state,
        name: sanitizeLearnerName(action.name),
        updatedAt: new Date().toISOString(),
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.patch },
        updatedAt: new Date().toISOString(),
      };
    case 'REPLACE_STATE':
      return {
        ...action.state,
        name: sanitizeLearnerName(action.state.name),
      };
    case 'RECORD_PIC':
      return recordPicAttempt(
        state,
        action.questionId,
        action.score15,
        action.percent,
        action.input,
        action.codes,
      );
    case 'RECORD_FREE':
      return recordFreeAttempt(
        state,
        action.questionId,
        action.passedChecks,
        action.totalChecks,
        action.input,
      );
    case 'RECORD_READ':
      return recordReadAttempt(
        state,
        action.passageId,
        action.totalPct,
        action.breakdown,
        action.input,
      );
    case 'RECORD_EXAM':
      return recordExamAttempt(state, action.record);
    case 'RESET_ALL':
      return createDefaultState();
  }
}

export interface AppContextValue {
  readonly state: StorageV3;
  readonly resolvedTheme: 'light' | 'dark';
  readonly isOffline: boolean;
  readonly storageWarning: boolean;
  readonly pwaUpdate: PwaUpdateHandle | null;
  readonly voices: readonly VoiceInfo[];
  readonly activeVoice: VoiceInfo | null;
  readonly capabilities: SpeechCapabilities;
  readonly setName: (name: string) => void;
  readonly updateSettings: (patch: Partial<UserSettings>) => void;
  readonly replaceState: (next: StorageV3) => void;
  readonly recordPic: (
    questionId: string,
    score15: number,
    percent: number,
    input: string,
    codes: readonly string[],
  ) => void;
  readonly recordFree: (
    questionId: string,
    passedChecks: number,
    totalChecks: number,
    input: string,
  ) => void;
  readonly recordRead: (
    passageId: string,
    totalPct: number,
    breakdown: { h: number; k: number; i: number },
    input: string,
  ) => void;
  readonly recordExam: (record: ExamRecord) => void;
  readonly resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveThemePref(pref: UserSettings['theme']): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadStorageState());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveThemePref(state.settings.theme),
  );
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [storageWarning, setStorageWarning] = useState(false);
  const [pwaUpdate, setPwaUpdate] = useState<PwaUpdateHandle | null>(null);
  const [voices, setVoices] = useState<VoiceInfo[]>(() => getJapaneseVoices());
  const capabilities = useMemo(() => detectSpeechCapabilities(), []);
  const skipNextPersistRef = useRef(false);

  // Persist state whenever it changes (skipped immediately after resetAllData so localStorage stays clean)
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const ok = saveStorageState(state);
    queueMicrotask(() => {
      setStorageWarning(!ok);
    });
  }, [state]);

  // Sync theme preference & system color-scheme listener
  useEffect(() => {
    const apply = () => {
      const next = resolveThemePref(state.settings.theme);
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
    };
    apply();

    if (state.settings.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [state.settings.theme]);

  // Sync furigana CSS class & Japanese text size on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('hide-furigana', !state.settings.furigana);
  }, [state.settings.furigana]);

  useEffect(() => {
    document.documentElement.dataset.jpSize = state.settings.jpFontSize;
  }, [state.settings.jpFontSize]);

  // Online / offline listeners
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Japanese TTS voices discovery
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refreshVoices = () => setVoices(getJapaneseVoices());
    refreshVoices();
    const synth = window.speechSynthesis;
    synth.addEventListener?.('voiceschanged', refreshVoices);
    return () => synth.removeEventListener?.('voiceschanged', refreshVoices);
  }, []);

  // Service worker registration & update listener
  useEffect(() => {
    registerPwaServiceWorker((handle) => {
      setPwaUpdate(handle);
    });
  }, []);

  const activeVoice = useMemo(
    () => pickVoice(voices, state.settings.voiceURI),
    [voices, state.settings.voiceURI],
  );

  const setName = useCallback((name: string) => dispatch({ type: 'SET_NAME', name }), []);
  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => dispatch({ type: 'UPDATE_SETTINGS', patch }),
    [],
  );
  const replaceState = useCallback(
    (next: StorageV3) => dispatch({ type: 'REPLACE_STATE', state: next }),
    [],
  );
  const recordPic = useCallback(
    (
      questionId: string,
      score15: number,
      percent: number,
      input: string,
      codes: readonly string[],
    ) => dispatch({ type: 'RECORD_PIC', questionId, score15, percent, input, codes }),
    [],
  );
  const recordFree = useCallback(
    (questionId: string, passedChecks: number, totalChecks: number, input: string) =>
      dispatch({ type: 'RECORD_FREE', questionId, passedChecks, totalChecks, input }),
    [],
  );
  const recordRead = useCallback(
    (
      passageId: string,
      totalPct: number,
      breakdown: { h: number; k: number; i: number },
      input: string,
    ) => dispatch({ type: 'RECORD_READ', passageId, totalPct, breakdown, input }),
    [],
  );
  const recordExam = useCallback(
    (record: ExamRecord) => dispatch({ type: 'RECORD_EXAM', record }),
    [],
  );
  const resetAllData = useCallback(async () => {
    await clearAllUserData();
    skipNextPersistRef.current = true;
    setStorageWarning(false);
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      resolvedTheme,
      isOffline,
      storageWarning,
      pwaUpdate,
      voices,
      activeVoice,
      capabilities,
      setName,
      updateSettings,
      replaceState,
      recordPic,
      recordFree,
      recordRead,
      recordExam,
      resetAllData,
    }),
    [
      state,
      resolvedTheme,
      isOffline,
      storageWarning,
      pwaUpdate,
      voices,
      activeVoice,
      capabilities,
      setName,
      updateSettings,
      replaceState,
      recordPic,
      recordFree,
      recordRead,
      recordExam,
      resetAllData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
