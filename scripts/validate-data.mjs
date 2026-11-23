import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const picsDir = path.join(rootDir, 'assets', 'images', 'pictures');

const KanjiPairSchema = z.tuple([z.string().min(1), z.string().min(1)]);

const CfgSchema = z
  .object({
    code: z.string().min(1),
    key: z.string().min(1),
    bais: z.array(z.number().int().positive()).min(1),
    w: z.tuple([z.number().nonnegative(), z.number().nonnegative(), z.number().nonnegative()]),
    wt: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
    fmt: z.string().min(1),
    partial: z.boolean(),
    kx: z.array(KanjiPairSchema),
    vx: z.array(KanjiPairSchema),
    vs: z.record(z.string().min(1), z.string().min(1)),
  })
  .strict();

const ScaleItemSchema = z
  .object({
    name: z.string().min(1),
    pen: z.string().min(1),
    ex: z.string().min(1),
  })
  .strict();

const PicJudgeSchema = z
  .object({
    kind: z.enum(['WH', 'YN']),
    truth: z.enum(['yes', 'no']).nullable(),
    accept: z.array(z.string().min(1)).min(1),
    need: z.array(z.array(z.string().min(1)).min(1)),
    typ: z.string().min(1),
    rep: z.array(z.string().min(1)).optional(),
  })
  .strict();

const LadRowSchema = z
  .object({
    a: z.string().min(1),
    s: z.number().min(0).max(15),
    c: z.string().min(1).nullable(),
    why: z.string().min(1),
    hint: z.string().min(1),
  })
  .strict();

const RawPicQuestionSchema = z
  .object({
    id: z.string().min(1),
    pic: z.string().min(1),
    type: z.string().min(1),
    read: z.string().min(1),
    disp: z.string().min(1),
    vn: z.string().min(1),
    wh: z.string().min(1),
    ear: z.string().min(1),
    steps: z.string().min(1),
    pat: z.string().min(1),
    a1: z.string().min(1),
    n1: z.string().min(1),
    a2: z.string().min(1),
    n2: z.string().min(1),
    j: PicJudgeSchema,
    trap: z.string().min(1).nullable(),
    pron: z.string().min(1).nullable(),
    lad: z.array(LadRowSchema).min(1),
  })
  .strict();

const RawFreeQuestionSchema = z
  .object({
    id: z.string().min(1),
    chu_de: z.string().min(1),
    ten_chu_de: z.string().min(1),
    dang_hoi: z.enum(['WH', 'YN-N']),
    cau_hoi_doc: z.string().min(1),
    nghia_vn: z.string().min(1),
    cau_truc: z.string().min(1),
    tu_vung: z.string().min(1),
    tra_loi_1: z.string().min(1),
    nghia_1: z.string().min(1),
    tra_loi_2: z.string().min(1),
    nghia_2: z.string().min(1),
    tu_soat_thong_tin: z.string().min(1),
    tu_soat_nhac: z.string().min(1),
  })
  .strict();

const RawDataFileSchema = z
  .object({
    bai: z.record(
      z.string().regex(/^\d+$/),
      z
        .object({
          pic: z.array(RawPicQuestionSchema),
          free: z.array(RawFreeQuestionSchema),
        })
        .strict(),
    ),
    scale: z.record(z.string().min(1), ScaleItemSchema),
  })
  .strict();

const RawRdFileSchema = z.record(
  z.string().regex(/^\d+$/),
  z.array(
    z
      .object({
        id: z.string().min(1),
        mk: z.string().min(1),
        han: z.array(KanjiPairSchema),
        title: z.string().min(1).optional(),
        nw: z.array(z.tuple([z.string(), z.string(), z.string()])).optional(),
      })
      .strict(),
  ),
);

const rawCfg = JSON.parse(fs.readFileSync(path.join(dataDir, 'cfg.json'), 'utf8'));
const rawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'));
const rawRd = JSON.parse(fs.readFileSync(path.join(dataDir, 'rd.json'), 'utf8'));
const pics = new Set(
  fs
    .readdirSync(picsDir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => path.basename(f, '.png')),
);

// Known immutable upstream anomaly documented in docs/DATA-REPORT.md & ADR-010:
// R9 is used in 10 Bài 3 lad[] entries (and handled by gradePic) but omitted from data.scale.
// Pass --strict-scale to fail even on known upstream R9 anomaly.
const strictScale = process.argv.includes('--strict-scale');
const WAIVED_UPSTREAM_SCALE_CODES = strictScale ? new Set() : new Set(['R9']);

const errors = [];
const warnings = [];

const cfgRes = CfgSchema.safeParse(rawCfg);
const dataRes = RawDataFileSchema.safeParse(rawData);
const rdRes = RawRdFileSchema.safeParse(rawRd);

for (const [name, res] of [
  ['cfg.json', cfgRes],
  ['data.json', dataRes],
  ['rd.json', rdRes],
]) {
  if (!res.success) {
    for (const issue of res.error.issues) {
      errors.push(`[${name}] ${issue.path.join('.')}: ${issue.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Data schema validation FAILED:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

const cfg = cfgRes.data;
const data = dataRes.data;
const rd = rdRes.data;

const seenIds = new Set();
const usedPics = new Map();
const r9Locations = [];
const MOJIBAKE_RX = /[\uFFFD]|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â€™|â€œ|â€/;

const checkText = (str, loc) => {
  if (MOJIBAKE_RX.test(str)) warnings.push(`[MOJIBAKE] ${loc}: ${str.slice(0, 60)}`);
  for (const ch of str) {
    if (ch === '\n' || ch === '\r' || ch === '\t') continue;
    if (/[\p{Cc}]/u.test(ch)) {
      warnings.push(`[CTRL_CHAR] ${loc}`);
      break;
    }
  }
};

let picTotal = 0;
let freeTotal = 0;
let readTotal = 0;

for (const b of cfg.bais) {
  const bk = String(b);
  const baiObj = data.bai[bk];
  if (!baiObj) {
    errors.push(`Missing bai.${bk} in data.json`);
    continue;
  }
  for (const q of baiObj.pic) {
    picTotal++;
    if (seenIds.has(q.id)) errors.push(`Duplicate id: ${q.id}`);
    seenIds.add(q.id);
    usedPics.set(q.pic, (usedPics.get(q.pic) || 0) + 1);
    if (!pics.has(q.pic)) errors.push(`Missing picture file for ${q.id}: ${q.pic}.png`);
    if (q.j.accept.length === 0) errors.push(`Empty j.accept in ${q.id}`);
    if (q.j.rep) {
      for (const rule of q.j.rep) {
        if (rule.startsWith('re:')) {
          const pattern = rule.slice(3);
          if (pattern.length > 120 || /\([^)]*[+*][^)]*\)[+*]/.test(pattern)) {
            errors.push(`Potentially unsafe regex in ${q.id}.j.rep: ${rule}`);
          } else {
            try {
              // eslint-disable-next-line security/detect-non-literal-regexp -- build-time syntax check of static data regex after nested-quantifier guard
              new RegExp(pattern);
            } catch {
              errors.push(`Invalid regex in ${q.id}.j.rep: ${rule}`);
            }
          }
        }
      }
    }
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === 'string') checkText(v, `${q.id}.${k}`);
    }
    for (const l of q.lad) {
      checkText(l.a, `${q.id}.lad.a`);
      checkText(l.why, `${q.id}.lad.why`);
      checkText(l.hint, `${q.id}.lad.hint`);
      if (l.c && !Object.prototype.hasOwnProperty.call(data.scale, l.c)) {
        if (WAIVED_UPSTREAM_SCALE_CODES.has(l.c)) {
          r9Locations.push({ id: q.id, code: l.c, a: l.a, s: l.s, why: l.why });
          warnings.push(`[UPSTREAM_SCALE_OMISSION] ${q.id}: code "${l.c}" missing from data.scale`);
        } else {
          errors.push(`Unknown error code "${l.c}" in ${q.id}.lad (not in data.scale)`);
        }
      }
    }
  }

  for (const q of baiObj.free) {
    freeTotal++;
    if (seenIds.has(q.id)) errors.push(`Duplicate id: ${q.id}`);
    seenIds.add(q.id);
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === 'string') checkText(v, `${q.id}.${k}`);
    }
  }

  for (const p of rd[bk] || []) {
    readTotal++;
    if (seenIds.has(p.id)) errors.push(`Duplicate id: ${p.id}`);
    seenIds.add(p.id);
    checkText(p.mk, `${p.id}.mk`);
  }
}

for (const picKey of pics) {
  if (!usedPics.has(picKey)) {
    warnings.push(`[UNUSED_PIC] assets/images/pictures/${picKey}.png`);
  }
}

if (errors.length > 0) {
  console.error('Data cross-validation FAILED:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

console.log(
  `OK: Data validated (${picTotal} pic, ${freeTotal} free, ${readTotal} read, ${pics.size} pictures; ${warnings.length} known upstream notices).`,
);
