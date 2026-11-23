import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CfgSchema,
  RawDataFileSchema,
  RawRdFileSchema,
  type RawFreeQuestion,
  type RawPicQuestion,
} from '../../src/data/schema';
import {
  createNormalizer,
  gradeFree,
  gradePic,
  gradeRead,
  prepareReadingPassage,
  romaToKana,
  romajiText,
  type PreparedReadingPassage,
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

interface BaselineFile {
  meta: { counts: Record<string, number> };
  normCases: { input: string; norm: string; romajiText: string; romaToKana: string | null }[];
  picCases: { id: string; kind: string; input: string; skip: boolean; expected: unknown }[];
  freeCases: { id: string; input: string; expected: unknown }[];
  readCases: { id: string; variant: string; input: string; expected: unknown }[];
  fuzzNormCases: { input: string; norm: string }[];
  fuzzPicCases: { id: string; input: string; expected: unknown }[];
  fuzzFreeCases: { id: string; input: string; expected: unknown }[];
  fuzzReadCases: { id: string; input: string; expected: unknown }[];
}

const baseline: BaselineFile = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'tests/golden/baseline.json'), 'utf8'),
);

const allPicQuestions: RawPicQuestion[] = cfg.bais.flatMap(
  (b) => rawData.bai[String(b)]?.pic ?? [],
);
const picById = new Map<string, RawPicQuestion>(allPicQuestions.map((q) => [q.id, q]));

const allFreeQuestions: RawFreeQuestion[] = cfg.bais.flatMap(
  (b) => rawData.bai[String(b)]?.free ?? [],
);
const freeById = new Map<string, RawFreeQuestion>(allFreeQuestions.map((q) => [q.id, q]));

const allReadPassages: PreparedReadingPassage[] = cfg.bais
  .flatMap((b) => rawRd[String(b)] ?? [])
  .map((p) => prepareReadingPassage(p, cfg.fmt));
const readById = new Map<string, PreparedReadingPassage>(allReadPassages.map((p) => [p.id, p]));

const { norm } = createNormalizer(cfg);
const picCtx = { cfg, scale: rawData.scale, allPicQuestions };

function stripUndefined<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

function normalizeReadComparison(obj: {
  total: number;
  h: unknown;
  k: unknown;
  i: unknown;
  errs: unknown;
  tally: unknown;
  norm: string;
  st: readonly { ok?: boolean; j: number }[];
}) {
  return stripUndefined({
    ...obj,
    // Legacy `eq` returned `undefined` instead of `false` when `ref[i].a` was absent;
    // both are falsy in JS boolean checks. Normalize `ok` to strict boolean for comparison.
    st: obj.st.map((slot) => ({ ok: Boolean(slot.ok), j: slot.j })),
  });
}

describe('Engine Golden Parity (100% match vs legacy/app-logic.original.js)', () => {
  it('matches all normalization & romaji baseline cases', () => {
    for (const tc of baseline.normCases) {
      expect(norm(tc.input), `norm("${tc.input}")`).toBe(tc.norm);
      expect(romajiText(tc.input), `romajiText("${tc.input}")`).toBe(tc.romajiText);
      if (tc.romaToKana !== null) {
        expect(romaToKana(tc.input), `romaToKana("${tc.input}")`).toBe(tc.romaToKana);
      }
    }
  });

  it('matches all 1,034 picture question grading cases (all lad[].a, j.accept[], rules & edges)', () => {
    for (const tc of baseline.picCases) {
      const q = picById.get(tc.id);
      expect(q, `Missing pic question ${tc.id}`).toBeDefined();
      if (!q) continue;
      const actual = stripUndefined(gradePic(q, tc.input, picCtx, tc.skip));
      expect(actual, `gradePic(${tc.id}, "${tc.input}", skip=${tc.skip})`).toEqual(tc.expected);
    }
  });

  it('matches all 224 free question grading cases', () => {
    for (const tc of baseline.freeCases) {
      const q = freeById.get(tc.id);
      expect(q, `Missing free question ${tc.id}`).toBeDefined();
      if (!q) continue;
      const actual = gradeFree(q, tc.input, cfg);
      expect(actual, `gradeFree(${tc.id}, "${tc.input}")`).toEqual(tc.expected);
    }
  });

  it('matches all 264 reading passage grading cases across all 44 passages', () => {
    for (const tc of baseline.readCases) {
      const p = readById.get(tc.id);
      expect(p, `Missing reading passage ${tc.id}`).toBeDefined();
      if (!p) continue;
      const res = gradeRead(p, tc.input, cfg);
      const comparable = normalizeReadComparison({
        total: res.total,
        h: res.h,
        k: res.k,
        i: res.i,
        errs: res.errs,
        tally: res.tally,
        norm: res.norm,
        st: res.st,
      });
      const expected = normalizeReadComparison(
        tc.expected as Parameters<typeof normalizeReadComparison>[0],
      );
      expect(comparable, `gradeRead(${tc.id}, ${tc.variant})`).toEqual(expected);
    }
  });

  it('matches all 260 seeded fuzz cases (norm, pic, free, read)', () => {
    for (const tc of baseline.fuzzNormCases) {
      expect(norm(tc.input), `fuzzNorm("${tc.input}")`).toBe(tc.norm);
    }
    for (const tc of baseline.fuzzPicCases) {
      const q = picById.get(tc.id);
      expect(q).toBeDefined();
      if (!q) continue;
      const actual = stripUndefined(gradePic(q, tc.input, picCtx, false));
      expect(actual, `fuzzPic(${tc.id}, "${tc.input}")`).toEqual(tc.expected);
    }
    for (const tc of baseline.fuzzFreeCases) {
      const q = freeById.get(tc.id);
      expect(q).toBeDefined();
      if (!q) continue;
      expect(gradeFree(q, tc.input, cfg), `fuzzFree(${tc.id}, "${tc.input}")`).toEqual(tc.expected);
    }
    for (const tc of baseline.fuzzReadCases) {
      const p = readById.get(tc.id);
      expect(p).toBeDefined();
      if (!p) continue;
      const res = gradeRead(p, tc.input, cfg);
      const comparable = normalizeReadComparison({
        total: res.total,
        h: res.h,
        k: res.k,
        i: res.i,
        errs: res.errs,
        tally: res.tally,
        norm: res.norm,
        st: res.st,
      });
      const expected = normalizeReadComparison(
        tc.expected as Parameters<typeof normalizeReadComparison>[0],
      );
      expect(comparable, `fuzzRead(${tc.id}, "${tc.input}")`).toEqual(expected);
    }
  });
});
