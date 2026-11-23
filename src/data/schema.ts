import { z } from 'zod';

z.config({ jitless: true });

export const KanjiPairSchema = z.tuple([z.string().min(1), z.string().min(1)]);

export const CfgSchema = z
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

export const ScaleItemSchema = z
  .object({
    name: z.string().min(1),
    pen: z.string().min(1),
    ex: z.string().min(1),
  })
  .strict();

export const ScaleSchema = z.record(z.string().min(1), ScaleItemSchema);

export const PicJudgeSchema = z
  .object({
    kind: z.enum(['WH', 'YN']),
    truth: z.enum(['yes', 'no']).nullable(),
    accept: z.array(z.string().min(1)).min(1),
    need: z.array(z.array(z.string().min(1)).min(1)),
    typ: z.string().min(1),
    rep: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const LadRowSchema = z
  .object({
    a: z.string().min(1),
    s: z.number().min(0).max(15),
    c: z.string().min(1).nullable(),
    why: z.string().min(1),
    hint: z.string().min(1),
  })
  .strict();

export const RawPicQuestionSchema = z
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

export const RawFreeQuestionSchema = z
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

export const RawBaiDataSchema = z
  .object({
    pic: z.array(RawPicQuestionSchema),
    free: z.array(RawFreeQuestionSchema),
  })
  .strict();

export const RawDataFileSchema = z
  .object({
    bai: z.record(z.string().regex(/^\d+$/), RawBaiDataSchema),
    scale: ScaleSchema,
  })
  .strict();

export const RawReadingPassageSchema = z
  .object({
    id: z.string().min(1),
    mk: z.string().min(1),
    han: z.array(KanjiPairSchema),
    title: z.string().min(1).optional(),
    nw: z.array(z.tuple([z.string(), z.string(), z.string()])).optional(),
  })
  .strict();

export const RawRdFileSchema = z.record(
  z.string().regex(/^\d+$/),
  z.array(RawReadingPassageSchema),
);

export const LessonBundleSchema = z
  .object({
    bai: z.number().int().positive(),
    pic: z.array(RawPicQuestionSchema),
    free: z.array(RawFreeQuestionSchema),
    read: z.array(RawReadingPassageSchema),
  })
  .strict();

export type CfgData = z.infer<typeof CfgSchema>;
export type ScaleMap = z.infer<typeof ScaleSchema>;
export type ScaleItem = z.infer<typeof ScaleItemSchema>;
export type PicJudge = z.infer<typeof PicJudgeSchema>;
export type LadRow = z.infer<typeof LadRowSchema>;
export type RawPicQuestion = z.infer<typeof RawPicQuestionSchema>;
export type RawFreeQuestion = z.infer<typeof RawFreeQuestionSchema>;
export type RawDataFile = z.infer<typeof RawDataFileSchema>;
export type RawReadingPassage = z.infer<typeof RawReadingPassageSchema>;
export type RawRdFile = z.infer<typeof RawRdFileSchema>;
export type LessonBundle = z.infer<typeof LessonBundleSchema>;

export interface CrossValidationOptions {
  /** Known upstream error codes documented in docs/DATA-REPORT.md when immutable source data cannot be modified */
  waivedScaleCodes?: ReadonlySet<string>;
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  location: string;
  message: string;
}

export interface DataValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    picCount: number;
    freeCount: number;
    readCount: number;
    pictureCount: number;
  };
}

const MOJIBAKE_RX = /[\uFFFD]|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â€™|â€œ|â€/;
const CTRL_CHAR_RX = /[\p{Cc}]/u;

function hasUnexpectedControlChar(text: string): boolean {
  for (const ch of text) {
    if (ch === '\n' || ch === '\r' || ch === '\t') continue;
    if (CTRL_CHAR_RX.test(ch)) return true;
  }
  return false;
}

export function validateAllSources(
  rawCfg: unknown,
  rawData: unknown,
  rawRd: unknown,
  availablePictureKeys: ReadonlySet<string>,
  options: CrossValidationOptions = {},
): DataValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const waived = options.waivedScaleCodes ?? new Set<string>();

  const cfgRes = CfgSchema.safeParse(rawCfg);
  if (!cfgRes.success) {
    for (const issue of cfgRes.error.issues) {
      errors.push({
        severity: 'error',
        code: 'SCHEMA_CFG',
        location: `cfg.json:${issue.path.join('.')}`,
        message: issue.message,
      });
    }
  }

  const dataRes = RawDataFileSchema.safeParse(rawData);
  if (!dataRes.success) {
    for (const issue of dataRes.error.issues) {
      errors.push({
        severity: 'error',
        code: 'SCHEMA_DATA',
        location: `data.json:${issue.path.join('.')}`,
        message: issue.message,
      });
    }
  }

  const rdRes = RawRdFileSchema.safeParse(rawRd);
  if (!rdRes.success) {
    for (const issue of rdRes.error.issues) {
      errors.push({
        severity: 'error',
        code: 'SCHEMA_RD',
        location: `rd.json:${issue.path.join('.')}`,
        message: issue.message,
      });
    }
  }

  if (!cfgRes.success || !dataRes.success || !rdRes.success) {
    return {
      ok: false,
      errors,
      warnings,
      stats: { picCount: 0, freeCount: 0, readCount: 0, pictureCount: availablePictureKeys.size },
    };
  }

  const cfg = cfgRes.data;
  const data = dataRes.data;
  const rd = rdRes.data;

  const weightSum = cfg.w[0] + cfg.w[1] + cfg.w[2];
  if (Math.abs(weightSum - 1) > 0.001) {
    errors.push({
      severity: 'error',
      code: 'WEIGHT_SUM',
      location: 'cfg.json:w',
      message: `Tổng trọng số w phải bằng 1, hiện tại = ${weightSum}`,
    });
  }

  const seenIds = new Set<string>();
  const usedPics = new Set<string>();
  let picCount = 0;
  let freeCount = 0;
  let readCount = 0;

  const checkId = (id: string, loc: string) => {
    if (seenIds.has(id)) {
      errors.push({
        severity: 'error',
        code: 'DUPLICATE_ID',
        location: loc,
        message: `Trùng mã id "${id}"`,
      });
    }
    seenIds.add(id);
  };

  const checkTextQuality = (text: string, loc: string) => {
    if (MOJIBAKE_RX.test(text)) {
      warnings.push({
        severity: 'warning',
        code: 'MOJIBAKE',
        location: loc,
        message: `Nghi ngờ lỗi mã hóa ký tự (mojibake): "${text.slice(0, 60)}"`,
      });
    }
    if (hasUnexpectedControlChar(text)) {
      warnings.push({
        severity: 'warning',
        code: 'CTRL_CHAR',
        location: loc,
        message: `Có ký tự điều khiển lạ trong chuỗi`,
      });
    }
  };

  for (const baiNum of cfg.bais) {
    const bk = String(baiNum);
    const baiData = data.bai[bk];
    if (!baiData) {
      errors.push({
        severity: 'error',
        code: 'MISSING_BAI',
        location: `data.json:bai.${bk}`,
        message: `Thiếu dữ liệu Bài ${bk}`,
      });
      continue;
    }

    for (const q of baiData.pic) {
      picCount++;
      checkId(q.id, `data.json:bai.${bk}.pic.${q.id}`);
      usedPics.add(q.pic);
      if (!availablePictureKeys.has(q.pic)) {
        errors.push({
          severity: 'error',
          code: 'MISSING_PIC',
          location: `data.json:${q.id}.pic`,
          message: `Ảnh "${q.pic}" không tồn tại trong assets/images/pictures/`,
        });
      }
      if (q.j.accept.length === 0) {
        errors.push({
          severity: 'error',
          code: 'EMPTY_ACCEPT',
          location: `data.json:${q.id}.j.accept`,
          message: `Mảng j.accept rỗng`,
        });
      }
      for (const [k, v] of Object.entries(q)) {
        if (typeof v === 'string') checkTextQuality(v, `data.json:${q.id}.${k}`);
      }
      for (const l of q.lad) {
        checkTextQuality(l.a, `data.json:${q.id}.lad.a`);
        checkTextQuality(l.why, `data.json:${q.id}.lad.why`);
        checkTextQuality(l.hint, `data.json:${q.id}.lad.hint`);
        if (l.c !== null && !Object.prototype.hasOwnProperty.call(data.scale, l.c)) {
          const issue: ValidationIssue = {
            severity: waived.has(l.c) ? 'warning' : 'error',
            code: 'UNKNOWN_SCALE_CODE',
            location: `data.json:${q.id}.lad`,
            message: `Mã lỗi "${l.c}" xuất hiện trong lad nhưng chưa được định nghĩa trong data.scale`,
          };
          if (waived.has(l.c)) {
            warnings.push(issue);
          } else {
            errors.push(issue);
          }
        }
      }
    }

    for (const q of baiData.free) {
      freeCount++;
      checkId(q.id, `data.json:bai.${bk}.free.${q.id}`);
      for (const [k, v] of Object.entries(q)) {
        if (typeof v === 'string') checkTextQuality(v, `data.json:${q.id}.${k}`);
      }
    }

    const rdList = rd[bk] ?? [];
    for (const p of rdList) {
      readCount++;
      checkId(p.id, `rd.json:${bk}.${p.id}`);
      checkTextQuality(p.mk, `rd.json:${p.id}.mk`);
    }
  }

  for (const picKey of availablePictureKeys) {
    if (!usedPics.has(picKey)) {
      warnings.push({
        severity: 'warning',
        code: 'UNUSED_PIC',
        location: `assets/images/pictures/${picKey}.png`,
        message: `Ảnh "${picKey}.png" không được câu hỏi nào tham chiếu`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      picCount,
      freeCount,
      readCount,
      pictureCount: availablePictureKeys.size,
    },
  };
}
