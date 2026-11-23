import { beforeEach, describe, expect, it } from 'vitest';
import { validateExternalUrl } from '../../src/lib/externalLinks';
import { computeStreak } from '../../src/lib/date';
import { safeJsonParse, sanitizeLearnerName } from '../../src/lib/sanitize';
import {
  LEGACY_STORAGE_KEY_V2,
  STORAGE_KEY_V3,
  clearAllUserData,
  createDefaultState,
  exportProgressJson,
  importProgressJson,
  loadStorageState,
  migrateFromLegacyV2,
  recordPicAttempt,
  recordReadAttempt,
} from '../../src/storage';

describe('Security & Storage v3 (migration, XSS sanitization, backup checksum, prototype pollution)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sanitizes XSS payloads and weird characters in learner names', () => {
    expect(sanitizeLearnerName('<img src=x onerror=alert(1)>')).not.toMatch(/[<>"/=()]/);
    expect(sanitizeLearnerName('<script>alert(1)</script>')).not.toContain('<');
    expect(sanitizeLearnerName('   ')).toBe('ミン');
    expect(sanitizeLearnerName('ナム')).toBe('ナム');
    expect(sanitizeLearnerName('Minh Nguyễn 2026')).toBe('Minh Nguyễn 2026');
    expect(sanitizeLearnerName('あ'.repeat(50)).length).toBeLessThanOrEqual(16);
  });

  it('enforces external URL HTTPS allowlist strictly', () => {
    expect(validateExternalUrl('https://manabiman.io.vn/app/#/thi/JPD113/mau')).toBe(
      'https://manabiman.io.vn/app/#/thi/JPD113/mau',
    );
    expect(validateExternalUrl(`javascript${':alert(1)'}`)).toBeNull();
    expect(validateExternalUrl('http://manabiman.io.vn/app/')).toBeNull();
    expect(validateExternalUrl('https://evil.example.com/phish')).toBeNull();
    expect(validateExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('migrates legacy rbl-jpd113-web-v2 without destroying legacy data and ignores jpds-min', () => {
    const legacy = {
      _name: 'ナム<script>',
      _voice: 'Microsoft Nanami Online',
      _pcOff: 1,
      'B1-T01-1': { n: 3, best: 100, last: 'ロシアです' },
      'KT113-B1-01': { n: 2, best: 0, last: 'ナムです' },
      'R:L1.1': { n: 4, best: 90, last: 'かぞくのしごとです' },
    };
    const rawLegacy = JSON.stringify(legacy);
    window.localStorage.setItem(LEGACY_STORAGE_KEY_V2, rawLegacy);
    window.localStorage.setItem('jpds-min', '1');

    const loaded = loadStorageState();
    expect(loaded.schema).toBe(3);
    expect(loaded.name).toBe('ナムscript');
    expect(loaded.settings.voiceURI).toBe('Microsoft Nanami Online');
    expect(loaded.settings.pcBannerDismissed).toBe(true);
    expect(loaded.settings.showPromo).toBe(false);
    expect(loaded.attempts['B1-T01-1']?.best).toBe(100);
    expect(loaded.attempts['B1-T01-1']?.count).toBe(3);
    expect(loaded.readAttempts['L1.1']?.best).toBe(90);
    expect(loaded.readAttempts['L1.1']?.count).toBe(4);

    // Non-destructive: legacy key remains intact
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY_V2)).toBe(rawLegacy);
    expect(window.localStorage.getItem(STORAGE_KEY_V3)).not.toBeNull();
  });

  it('recovers safely from corrupted localStorage JSON', () => {
    window.localStorage.setItem(STORAGE_KEY_V3, '{not valid json');
    expect(loadStorageState().schema).toBe(3);
    expect(migrateFromLegacyV2('{"__proto__":{"polluted":true}}')).toBeNull();
  });

  it('exports and imports valid SHA-256 progress backup cleanly', async () => {
    let st = createDefaultState('2026-11-24T00:00:00.000Z');
    st = recordPicAttempt(st, 'B1-T01-1', 15, 100, 'ロシアです', []);
    st = recordReadAttempt(st, 'L1.1', 95, { h: 100, k: 100, i: 88 }, 'かぞく...');

    const exported = await exportProgressJson(st);
    const res = await importProgressJson(exported);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.attempts['B1-T01-1']?.best).toBe(100);
      expect(res.data.readAttempts['L1.1']?.best).toBe(95);
    }
  });

  it('rejects tampered checksum, prototype pollution, oversized 10MB payload, and invalid schema', async () => {
    const valid = await exportProgressJson(createDefaultState('2026-11-24T00:00:00.000Z'));

    // Tampered checksum
    const tampered = valid.replace('"ミン"', '"ハッカー"');
    const tamperedRes = await importProgressJson(tampered);
    expect(tamperedRes.ok).toBe(false);

    // Prototype pollution payloads
    const proto1 = '{"format":"jpd113-backup","__proto__":{"isAdmin":true}}';
    expect((await importProgressJson(proto1)).ok).toBe(false);
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();

    const proto2 = '{"constructor":{"prototype":{"polluted":1}}}';
    expect(() => safeJsonParse(proto2)).toThrow();
    expect((await importProgressJson(proto2)).ok).toBe(false);

    // Oversized > 1MB DoS payload
    const huge = `{"a":"${'x'.repeat(2_000_000)}"}`;
    const hugeRes = await importProgressJson(huge);
    expect(hugeRes.ok).toBe(false);

    // Unknown extra field in strict schema
    const badSchema = JSON.stringify({
      format: 'jpd113-backup',
      version: 3,
      exportedAt: '2026-11-24T00:00:00.000Z',
      sha256: 'a'.repeat(64),
      payload: { ...createDefaultState(), rogue: true },
    });
    expect((await importProgressJson(badSchema)).ok).toBe(false);
  });

  it('clears all storage keys cleanly and computes daily streak accurately', async () => {
    window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(createDefaultState()));
    window.localStorage.setItem(LEGACY_STORAGE_KEY_V2, '{}');
    await clearAllUserData();
    expect(window.localStorage.getItem(STORAGE_KEY_V3)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY_V2)).toBeNull();

    const ref = new Date(2026, 10, 24, 12, 0, 0);
    expect(computeStreak(['2026-11-22', '2026-11-23', '2026-11-24'], ref)).toBe(3);
    expect(computeStreak(['2026-11-23'], ref)).toBe(1);
    expect(computeStreak(['2026-11-20'], ref)).toBe(0);
  });
});
