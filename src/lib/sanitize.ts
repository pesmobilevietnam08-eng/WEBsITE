export const DEFAULT_LEARNER_NAME = 'ミン';
export const MAX_LEARNER_NAME_LEN = 16;
export const MAX_JSON_DEPTH = 20;

const ALLOWED_NAME_CHAR_RX =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{L}\p{N}\s'ー-]/u;

export const SAFE_RECORD_KEY_RX = /^[A-Za-z0-9._-]{1,64}$/;

const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeRecordKey(key: string): boolean {
  return SAFE_RECORD_KEY_RX.test(key) && !FORBIDDEN_JSON_KEYS.has(key);
}

/**
 * Sanitizes free-form learner display name:
 * - Normalizes NFKC
 * - Whitelists kana, kanji, Latin/Vietnamese letters, digits, spaces, hyphen, apostrophe, chouonpu
 * - Strips all HTML/script/control characters (<, >, ", &, \, /, etc.)
 * - Limits length to MAX_LEARNER_NAME_LEN characters
 */
export function sanitizeLearnerName(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_LEARNER_NAME;
  const normalized = raw.normalize('NFKC');
  let out = '';
  for (const ch of normalized) {
    if (ALLOWED_NAME_CHAR_RX.test(ch)) {
      out += ch;
    }
    if (out.length >= MAX_LEARNER_NAME_LEN * 2) break;
  }
  const trimmed = out.replace(/\s+/g, ' ').trim().slice(0, MAX_LEARNER_NAME_LEN).trim();
  return trimmed || DEFAULT_LEARNER_NAME;
}

export class PrototypePollutionError extends Error {
  constructor(key: string) {
    super(`Từ chối khóa không an toàn trong dữ liệu JSON: ${key}`);
    this.name = 'PrototypePollutionError';
  }
}

export class JsonDepthError extends Error {
  constructor(maxDepth: number) {
    super(`Dữ liệu JSON lồng nhau vượt quá độ sâu cho phép (${maxDepth}).`);
    this.name = 'JsonDepthError';
  }
}

/**
 * Linear O(n) pre-scan that rejects deeply nested JSON before JSON.parse() runs,
 * preventing call-stack exhaustion DoS attacks.
 */
function assertJsonDepthWithinLimit(raw: string, maxDepth: number): void {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      depth++;
      if (depth > maxDepth) {
        throw new JsonDepthError(maxDepth);
      }
    } else if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1);
    }
  }
}

/**
 * Parses JSON while strictly rejecting:
 * - excessive nesting depth (> maxDepth, default 20)
 * - prototype-pollution keys (`__proto__`, `constructor`, `prototype`) anywhere in the tree
 * Uses iterative traversal so deep trees can never overflow the call stack.
 */
export function safeJsonParse(raw: string, maxDepth: number = MAX_JSON_DEPTH): unknown {
  assertJsonDepthWithinLimit(raw, maxDepth);

  // Guard against raw payload containing explicit __proto__ property token
  if (/"__proto__"\s*:/.test(raw)) {
    throw new PrototypePollutionError('__proto__');
  }

  const parsed: unknown = JSON.parse(raw, (key, value: unknown) => {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      throw new PrototypePollutionError(key);
    }
    return value;
  });

  // Iterative inspection of every object key in the parsed structure
  const stack: unknown[] = [parsed];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === 'object') stack.push(item);
      }
      continue;
    }
    const rec = node as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      if (FORBIDDEN_JSON_KEYS.has(k)) {
        throw new PrototypePollutionError(k);
      }
      const val = rec[k];
      if (val && typeof val === 'object') stack.push(val);
    }
  }

  return parsed;
}
