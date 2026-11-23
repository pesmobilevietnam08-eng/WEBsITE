import fs from 'node:fs';
import path from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CfgSchema, RawDataFileSchema, RawRdFileSchema } from '../../src/data/schema';
import {
  createNormalizer,
  formatQuestionText,
  gradeFree,
  gradePic,
  gradeRead,
  labelOf,
  parseDisplayHighlight,
  prepareReadingPassage,
  splitSpokenQuestion,
} from '../../src/engine';

const rootDir = path.resolve(__dirname, '..', '..');
const cfg = CfgSchema.parse(
  JSON.parse(fs.readFileSync(path.join(rootDir, 'data/cfg.json'), 'utf8')),
);
const rawData = RawDataFileSchema.parse(
  JSON.parse(fs.readFileSync(path.join(rootDir, 'data/data.json'), 'utf8')),
);
const rawRd = RawRdFileSchema.parse(
  JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rd.json'), 'utf8')),
);

const allPicQuestions = cfg.bais.flatMap((b) => rawData.bai[String(b)]?.pic ?? []);
const samplePic = allPicQuestions[0]!;
const sampleFree = rawData.bai['1']!.free[0]!;
const sampleRead = prepareReadingPassage(rawRd['1']![0]!, cfg.fmt);
const picCtx = { cfg, scale: rawData.scale, allPicQuestions };
const { norm } = createNormalizer(cfg);

describe('Engine property-based & ReDoS safety tests', () => {
  it('norm is idempotent on arbitrary strings (when normalized result stays within length cap)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), (input) => {
        const once = norm(input);
        const twice = norm(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 200 },
    );
  });

  it('gradePic never throws and always keeps scores in [0, 15] and percent in [0, 100]', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (input) => {
        const res = gradePic(samplePic, input, picCtx);
        expect(res.s).toBeGreaterThanOrEqual(0);
        expect(res.s).toBeLessThanOrEqual(15);
        expect(res.p).toBeGreaterThanOrEqual(0);
        expect(res.p).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });

  it('gradeFree never throws and always returns 3 boolean checklist items', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (input) => {
        const res = gradeFree(sampleFree, input, cfg);
        expect(res).toHaveLength(3);
        for (const item of res) {
          expect(typeof item.ok).toBe('boolean');
        }
      }),
      { numRuns: 150 },
    );
  });

  it('gradeRead never throws and always returns total in [0, 100] with valid DiffTokens', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 250 }), (input) => {
        const res = gradeRead(sampleRead, input, cfg);
        expect(res.total).toBeGreaterThanOrEqual(0);
        expect(res.total).toBeLessThanOrEqual(100);
        expect(Array.isArray(res.diff)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('handles adversarial 10,000-character, emoji, RTL, and XSS inputs quickly without ReDoS', () => {
    const adversarialInputs = [
      'a'.repeat(10_000),
      '1,111,111,111'.repeat(800) + '円',
      '一二三四五六七八九十百千万'.repeat(700) + '円',
      '😀🔥🇯🇵\u202E<img src=x onerror=alert(1)>'.repeat(300),
      'はははははわわわわわえええええおおおおお'.repeat(500),
      '\u0000\u0007\uFEFF\u200B'.repeat(2000),
      '\uFDFA'.repeat(2000),
      '99999999円'.repeat(300),
    ];

    // M-04: NFKC & numeric expansions must stay strictly bounded <= 500 (QA)
    expect(norm('\uFDFA'.repeat(500)).length).toBeLessThanOrEqual(500);
    expect(norm('99999999円'.repeat(200)).length).toBeLessThanOrEqual(500);

    const start = performance.now();
    for (const bad of adversarialInputs) {
      const picRes = gradePic(samplePic, bad, picCtx);
      const freeRes = gradeFree(sampleFree, bad, cfg);
      const readRes = gradeRead(sampleRead, bad, cfg);
      expect(picRes.s).toBeGreaterThanOrEqual(0);
      expect(freeRes).toHaveLength(3);
      expect(readRes.total).toBeGreaterThanOrEqual(0);
    }
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(1000);
  });

  it('covers helpers: formatQuestionText, parseDisplayHighlight, splitSpokenQuestion, labelOf', () => {
    expect(formatQuestionText('Aさんのおなまえは？', 'ナム')).toBe('ナムさんのおなまえは？');
    expect(formatQuestionText('Aさんのおなまえは？', '  ')).toBe('ミンさんのおなまえは？');
    expect(parseDisplayHighlight('ソフィアさんの 【どちら】ですか。')).toEqual([
      { text: 'ソフィアさんの ', mark: false },
      { text: 'どちら', mark: true },
      { text: 'ですか。', mark: false },
    ]);
    expect(splitSpokenQuestion('おなまえはなんですか。よろしく。')).toEqual([
      'おなまえはなんですか？',
      'よろしく。',
    ]);
    expect(labelOf(100).tone).toBe('good');
    expect(labelOf(85).tone).toBe('mid');
    expect(labelOf(65).tone).toBe('mid');
    expect(labelOf(40).tone).toBe('low');
  });
});
