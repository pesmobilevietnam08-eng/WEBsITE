export const DEFAULT_LEARNER_NAME = 'ミン';
export const MAX_LEARNER_NAME_LEN = 16;

const ALLOWED_NAME_CHAR_RX =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{L}\p{N}\s'ー-]/u;

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

const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class PrototypePollutionError extends Error {
  constructor(key: string) {
    super(`Từ chối khóa không an toàn trong dữ liệu JSON: ${key}`);
    this.name = 'PrototypePollutionError';
  }
}

/**
 * Parses JSON while strictly rejecting prototype-pollution keys
 * (`__proto__`, `constructor`, `prototype`) anywhere in the object tree.
 */
export function safeJsonParse(raw: string): unknown {
  const parsed: unknown = JSON.parse(raw, (key, value: unknown) => {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      throw new PrototypePollutionError(key);
    }
    return value;
  });

  // Also detect literal `"__proto__"` keys that native JSON.parse may treat specially before reviver
  const inspect = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) inspect(item);
      return;
    }
    for (const k of Object.keys(node as Record<string, unknown>)) {
      if (FORBIDDEN_JSON_KEYS.has(k)) {
        throw new PrototypePollutionError(k);
      }
      inspect((node as Record<string, unknown>)[k]);
    }
  };
  inspect(parsed);

  // Guard against raw payload containing explicit __proto__ property token
  if (/"__proto__"\s*:/.test(raw)) {
    throw new PrototypePollutionError('__proto__');
  }

  return parsed;
}
