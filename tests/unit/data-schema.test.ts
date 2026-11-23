import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAllSources } from '../../src/data/schema';

const rootDir = path.resolve(__dirname, '..', '..');
const rawCfg = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/cfg.json'), 'utf8'));
const rawData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/data.json'), 'utf8'));
const rawRd = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rd.json'), 'utf8'));
const picSet = new Set(
  fs
    .readdirSync(path.join(rootDir, 'assets/images/pictures'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, '')),
);

describe('Data Zod schema & cross-validation', () => {
  it('validates real data with explicit upstream R9 waiver and reports exact stats', () => {
    const res = validateAllSources(rawCfg, rawData, rawRd, picSet, {
      waivedScaleCodes: new Set(['R9']),
    });
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.stats).toEqual({
      picCount: 31,
      freeCount: 32,
      readCount: 44,
      pictureCount: 28,
    });
    expect(res.warnings.filter((w) => w.code === 'UNKNOWN_SCALE_CODE')).toHaveLength(10);
  });

  it('fails strictly when unknown scale code is NOT waived', () => {
    const res = validateAllSources(rawCfg, rawData, rawRd, picSet);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === 'UNKNOWN_SCALE_CODE')).toBe(true);
  });

  it('fails on extra unknown key (strict schema)', () => {
    const badCfg = { ...structuredClone(rawCfg), rogueKey: 123 };
    const res = validateAllSources(badCfg, rawData, rawRd, picSet, {
      waivedScaleCodes: new Set(['R9']),
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === 'SCHEMA_CFG')).toBe(true);
  });

  it('fails when pic references a non-existent image', () => {
    const badData = structuredClone(rawData);
    badData.bai['1'].pic[0].pic = 'NON-EXISTENT-PIC';
    const res = validateAllSources(rawCfg, badData, rawRd, picSet, {
      waivedScaleCodes: new Set(['R9']),
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === 'MISSING_PIC')).toBe(true);
  });

  it('fails when j.accept is empty', () => {
    const badData = structuredClone(rawData);
    badData.bai['1'].pic[0].j.accept = [];
    const res = validateAllSources(rawCfg, badData, rawRd, picSet, {
      waivedScaleCodes: new Set(['R9']),
    });
    expect(res.ok).toBe(false);
  });

  it('fails on duplicate question id', () => {
    const badData = structuredClone(rawData);
    badData.bai['1'].pic[1].id = badData.bai['1'].pic[0].id;
    const res = validateAllSources(rawCfg, badData, rawRd, picSet, {
      waivedScaleCodes: new Set(['R9']),
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_ID')).toBe(true);
  });
});
