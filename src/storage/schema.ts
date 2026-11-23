import { z } from 'zod';
import { DEFAULT_LEARNER_NAME } from '../lib/sanitize';

z.config({ jitless: true });

export const STORAGE_KEY_V3 = 'jpd113.v3';
export const LEGACY_STORAGE_KEY_V2 = 'rbl-jpd113-web-v2';
export const LEGACY_PROMO_KEY = 'jpds-min';

export const MAX_STORAGE_BYTES = 900_000;
export const MAX_IMPORT_BYTES = 1_048_576; // 1 MB
export const MAX_HISTORY_PER_ITEM = 20;

export const AttemptHistoryItemSchema = z
  .object({
    at: z.string().min(1).max(64),
    score: z.number().min(0).max(100),
    score15: z.number().min(0).max(15).optional(),
    codes: z.array(z.string().max(16)).max(12).optional(),
    input: z.string().max(2000),
  })
  .strict();

export const QuestionAttemptSchema = z
  .object({
    best: z.number().min(0).max(100),
    bestScore15: z.number().min(0).max(15).optional(),
    last: z.string().max(2000),
    count: z.number().int().min(0).max(100_000),
    lastAt: z.string().max(64).optional(),
    nextReviewAt: z.string().max(64).optional(),
    lastCodes: z.array(z.string().max(16)).max(12).optional(),
    history: z.array(AttemptHistoryItemSchema).max(MAX_HISTORY_PER_ITEM),
  })
  .strict();

export const ReadAttemptSchema = z
  .object({
    best: z.number().min(0).max(100),
    last: z.string().max(2500),
    count: z.number().int().min(0).max(100_000),
    lastAt: z.string().max(64).optional(),
    nextReviewAt: z.string().max(64).optional(),
    lastBreakdown: z
      .object({
        h: z.number().min(0).max(100),
        k: z.number().min(0).max(100),
        i: z.number().min(0).max(100),
      })
      .strict()
      .optional(),
    history: z.array(AttemptHistoryItemSchema).max(MAX_HISTORY_PER_ITEM),
  })
  .strict();

export const ExamRecordSchema = z
  .object({
    id: z.string().min(1).max(64),
    at: z.string().min(1).max(64),
    durationSec: z.number().int().min(0).max(7200),
    readScore: z.number().min(0).max(100),
    picAvgPct: z.number().min(0).max(100),
    freePassCount: z.number().int().min(0).max(20),
    freeTotal: z.number().int().min(0).max(20),
    overallPct: z.number().min(0).max(100),
    itemIds: z.array(z.string().max(40)).max(30),
  })
  .strict();

export const SettingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']),
    voiceURI: z.string().max(300).nullable(),
    furigana: z.boolean(),
    jpFontSize: z.enum(['sm', 'md', 'lg', 'xl']),
    typingOnly: z.boolean(),
    pcBannerDismissed: z.boolean(),
    speechPrivacyAccepted: z.boolean(),
    showPromo: z.boolean(),
    lastBai: z.number().int().min(1).max(10),
  })
  .strict();

export const StorageV3Schema = z
  .object({
    schema: z.literal(3),
    name: z.string().min(1).max(32),
    settings: SettingsSchema,
    attempts: z.record(z.string().min(1).max(64), QuestionAttemptSchema),
    readAttempts: z.record(z.string().min(1).max(64), ReadAttemptSchema),
    examHistory: z.array(ExamRecordSchema).max(50),
    activityDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(1000),
    createdAt: z.string().min(1).max(64),
    updatedAt: z.string().min(1).max(64),
  })
  .strict();

export const BackupEnvelopeSchema = z
  .object({
    format: z.literal('jpd113-backup'),
    version: z.literal(3),
    exportedAt: z.string().min(1).max(64),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    payload: StorageV3Schema,
  })
  .strict();

export type AttemptHistoryItem = z.infer<typeof AttemptHistoryItemSchema>;
export type QuestionAttemptRecord = z.infer<typeof QuestionAttemptSchema>;
export type ReadAttemptRecord = z.infer<typeof ReadAttemptSchema>;
export type ExamRecord = z.infer<typeof ExamRecordSchema>;
export type UserSettings = z.infer<typeof SettingsSchema>;
export type StorageV3 = z.infer<typeof StorageV3Schema>;
export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;

export function createDefaultState(nowIso: string = new Date().toISOString()): StorageV3 {
  return {
    schema: 3,
    name: DEFAULT_LEARNER_NAME,
    settings: {
      theme: 'system',
      voiceURI: null,
      furigana: true,
      jpFontSize: 'md',
      typingOnly: false,
      pcBannerDismissed: false,
      speechPrivacyAccepted: false,
      showPromo: false,
      lastBai: 1,
    },
    attempts: {},
    readAttempts: {},
    examHistory: [],
    activityDays: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
