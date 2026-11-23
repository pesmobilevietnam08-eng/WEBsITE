import { computeNextReviewIso, localDayKey } from '../lib/date';
import { safeJsonParse, sanitizeLearnerName } from '../lib/sanitize';
import { migrateFromLegacyV2 } from './migrate';
import {
  LEGACY_PROMO_KEY,
  LEGACY_STORAGE_KEY_V2,
  MAX_HISTORY_PER_ITEM,
  MAX_STORAGE_BYTES,
  STORAGE_KEY_V3,
  StorageV3Schema,
  createDefaultState,
  type ExamRecord,
  type StorageV3,
} from './schema';

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    if (new TextEncoder().encode(value).byteLength > MAX_STORAGE_BYTES) {
      return false;
    }
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors in restricted private browsing modes
  }
}

export function loadStorageState(): StorageV3 {
  const rawV3 = safeGetItem(STORAGE_KEY_V3);
  if (rawV3) {
    try {
      const parsed = safeJsonParse(rawV3);
      const res = StorageV3Schema.safeParse(parsed);
      if (res.success) {
        return {
          ...res.data,
          name: sanitizeLearnerName(res.data.name),
        };
      }
    } catch {
      // Fall through to legacy migration / safe default
    }
  }

  const rawLegacy = safeGetItem(LEGACY_STORAGE_KEY_V2);
  if (rawLegacy) {
    const migrated = migrateFromLegacyV2(rawLegacy);
    if (migrated) {
      saveStorageState(migrated);
      return migrated;
    }
  }

  return createDefaultState();
}

export function saveStorageState(state: StorageV3): boolean {
  const sanitized: StorageV3 = {
    ...state,
    name: sanitizeLearnerName(state.name),
    updatedAt: new Date().toISOString(),
  };
  const check = StorageV3Schema.safeParse(sanitized);
  if (!check.success) return false;
  return safeSetItem(STORAGE_KEY_V3, JSON.stringify(check.data));
}

export async function clearAllUserData(): Promise<void> {
  safeRemoveItem(STORAGE_KEY_V3);
  safeRemoveItem(LEGACY_STORAGE_KEY_V2);
  safeRemoveItem(LEGACY_PROMO_KEY);
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch {
    // ignore cache clear failures
  }
  try {
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.deleteDatabase === 'function') {
      indexedDB.deleteDatabase('workbox-expiration');
    }
  } catch {
    // ignore IndexedDB cleanup failures in restricted modes
  }
}

function appendActivityDay(days: readonly string[], now: Date): string[] {
  const today = localDayKey(now);
  if (days.includes(today)) return [...days];
  return [...days, today].slice(-365);
}

export function recordPicAttempt(
  state: StorageV3,
  questionId: string,
  score15: number,
  percent: number,
  input: string,
  errorCodes: readonly string[],
  now: Date = new Date(),
): StorageV3 {
  const iso = now.toISOString();
  const prev = state.attempts[questionId];
  const history = [
    ...(prev?.history ?? []),
    { at: iso, score: percent, score15, codes: [...errorCodes], input: input.slice(0, 500) },
  ].slice(-MAX_HISTORY_PER_ITEM);

  return {
    ...state,
    attempts: {
      ...state.attempts,
      [questionId]: {
        best: Math.max(prev?.best ?? 0, percent),
        bestScore15: Math.max(prev?.bestScore15 ?? 0, score15),
        last: input.slice(0, 500),
        count: (prev?.count ?? 0) + 1,
        lastAt: iso,
        nextReviewAt: computeNextReviewIso(percent, now),
        lastCodes: [...errorCodes],
        history,
      },
    },
    activityDays: appendActivityDay(state.activityDays, now),
    updatedAt: iso,
  };
}

export function recordFreeAttempt(
  state: StorageV3,
  questionId: string,
  passedChecks: number,
  totalChecks: number,
  input: string,
  now: Date = new Date(),
): StorageV3 {
  const iso = now.toISOString();
  const pct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  const prev = state.attempts[questionId];
  const history = [
    ...(prev?.history ?? []),
    { at: iso, score: pct, input: input.slice(0, 500) },
  ].slice(-MAX_HISTORY_PER_ITEM);

  return {
    ...state,
    attempts: {
      ...state.attempts,
      [questionId]: {
        best: Math.max(prev?.best ?? 0, pct),
        last: input.slice(0, 500),
        count: (prev?.count ?? 0) + 1,
        lastAt: iso,
        nextReviewAt: computeNextReviewIso(pct, now),
        history,
      },
    },
    activityDays: appendActivityDay(state.activityDays, now),
    updatedAt: iso,
  };
}

export function recordReadAttempt(
  state: StorageV3,
  passageId: string,
  totalPct: number,
  breakdown: { h: number; k: number; i: number },
  input: string,
  now: Date = new Date(),
): StorageV3 {
  const iso = now.toISOString();
  const prev = state.readAttempts[passageId];
  const history = [
    ...(prev?.history ?? []),
    { at: iso, score: totalPct, input: input.slice(0, 2000) },
  ].slice(-MAX_HISTORY_PER_ITEM);

  return {
    ...state,
    readAttempts: {
      ...state.readAttempts,
      [passageId]: {
        best: Math.max(prev?.best ?? 0, totalPct),
        last: input.slice(0, 2000),
        count: (prev?.count ?? 0) + 1,
        lastAt: iso,
        nextReviewAt: computeNextReviewIso(totalPct, now),
        lastBreakdown: breakdown,
        history,
      },
    },
    activityDays: appendActivityDay(state.activityDays, now),
    updatedAt: iso,
  };
}

export function recordExamAttempt(
  state: StorageV3,
  record: ExamRecord,
  now: Date = new Date(),
): StorageV3 {
  return {
    ...state,
    examHistory: [...state.examHistory, record].slice(-50),
    activityDays: appendActivityDay(state.activityDays, now),
    updatedAt: now.toISOString(),
  };
}
