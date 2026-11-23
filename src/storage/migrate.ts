import { isSafeRecordKey, safeJsonParse, sanitizeLearnerName } from '../lib/sanitize';
import {
  MAX_RECORD_ENTRIES,
  MAX_STORAGE_BYTES,
  StorageV3Schema,
  createDefaultState,
  type StorageV3,
} from './schema';

interface LegacyEntryLike {
  n?: unknown;
  best?: unknown;
  last?: unknown;
}

function clampInt(val: unknown, min: number, max: number): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : min;
  return Math.max(min, Math.min(max, num));
}

function safeString(val: unknown, maxLen: number): string {
  return typeof val === 'string' ? val.slice(0, maxLen) : '';
}

function defineOwnEntry<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Non-destructively migrates legacy flat `rbl-jpd113-web-v2` JSON into validated `StorageV3`.
 * `jpds-min` is intentionally ignored (promo module defaults to OFF).
 */
export function migrateFromLegacyV2(
  rawLegacyJson: string,
  nowIso: string = new Date().toISOString(),
): StorageV3 | null {
  if (typeof rawLegacyJson !== 'string' || !rawLegacyJson.trim()) {
    return null;
  }
  if (new TextEncoder().encode(rawLegacyJson).byteLength > MAX_STORAGE_BYTES) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = safeJsonParse(rawLegacyJson);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const state = createDefaultState(nowIso);

  if (typeof obj._name === 'string') {
    state.name = sanitizeLearnerName(obj._name);
  }
  if (typeof obj._voice === 'string' && obj._voice.trim()) {
    state.settings.voiceURI = obj._voice.slice(0, 300);
  }
  if (obj._pcOff === 1 || obj._pcOff === true) {
    state.settings.pcBannerDismissed = true;
  }

  let readCount = 0;
  let qaCount = 0;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as LegacyEntryLike;
    const count = clampInt(entry.n, 0, 100_000);
    const best = clampInt(entry.best, 0, 100);
    const last = safeString(entry.last, 2000);

    if (key.startsWith('R:')) {
      const readId = key.slice(2).trim();
      if (!isSafeRecordKey(readId) || readCount >= MAX_RECORD_ENTRIES) continue;
      defineOwnEntry(state.readAttempts, readId, {
        best,
        last,
        count,
        lastAt: nowIso,
        history: count > 0 ? [{ at: nowIso, score: best, input: last }] : [],
      });
      readCount++;
    } else {
      const qid = key.trim();
      if (!isSafeRecordKey(qid) || qaCount >= MAX_RECORD_ENTRIES) continue;
      defineOwnEntry(state.attempts, qid, {
        best,
        last,
        count,
        lastAt: nowIso,
        history: count > 0 ? [{ at: nowIso, score: best, input: last }] : [],
      });
      qaCount++;
    }
  }

  const validated = StorageV3Schema.safeParse(state);
  return validated.success ? validated.data : null;
}
