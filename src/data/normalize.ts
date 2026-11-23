import type {
  LadRow,
  LessonBundle,
  PicJudge,
  RawFreeQuestion,
  RawPicQuestion,
  RawReadingPassage,
} from './schema';
import { getPictureAlt } from './pictureAlt';

export interface PicQuestion {
  readonly kind: 'pic';
  readonly id: string;
  readonly bai: number;
  readonly index: number;
  readonly picKey: string;
  readonly picAlt: string;
  readonly title: string;
  readonly questionRead: string;
  readonly questionDisplay: string;
  readonly meaningVn: string;
  readonly whHint: string;
  readonly listenCues: readonly string[];
  readonly steps: readonly string[];
  readonly pattern: string;
  readonly sample1: { readonly jp: string; readonly vn: string };
  readonly sample2: { readonly jp: string; readonly vn: string };
  readonly trapCues: readonly string[];
  readonly pronCues: readonly string[];
  readonly judge: PicJudge;
  readonly ladder: readonly LadRow[];
  readonly raw: RawPicQuestion;
}

export interface FreeQuestion {
  readonly kind: 'free';
  readonly id: string;
  readonly bai: number;
  readonly index: number;
  readonly topicCode: string;
  readonly title: string;
  readonly questionForm: 'WH' | 'YN-N';
  readonly questionRead: string;
  readonly meaningVn: string;
  readonly pattern: string;
  readonly vocabList: readonly string[];
  readonly sample1: { readonly jp: string; readonly vn: string };
  readonly sample2: { readonly jp: string; readonly vn: string };
  readonly checklistInfo: string;
  readonly checklistNote: string;
  readonly raw: RawFreeQuestion;
}

export interface ReadingPassage {
  readonly kind: 'read';
  readonly id: string;
  readonly bai: number;
  readonly index: number;
  readonly markup: string;
  readonly hanList: readonly (readonly [string, string])[];
  readonly title?: string;
  readonly newWords: readonly (readonly [string, string, string])[];
  readonly raw: RawReadingPassage;
}

export interface LessonData {
  readonly bai: number;
  readonly pic: readonly PicQuestion[];
  readonly free: readonly FreeQuestion[];
  readonly read: readonly ReadingPassage[];
}

function splitBullets(raw: string | null | undefined, stripPattern: RegExp): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(stripPattern, ''));
}

export function normalizePicQuestion(
  raw: RawPicQuestion,
  bai: number,
  index: number,
): PicQuestion {
  return {
    kind: 'pic',
    id: raw.id,
    bai,
    index,
    picKey: raw.pic,
    picAlt: getPictureAlt(raw.pic),
    title: raw.type,
    questionRead: raw.read,
    questionDisplay: raw.disp,
    meaningVn: raw.vn,
    whHint: raw.wh,
    listenCues: splitBullets(raw.ear, /^$/),
    steps: raw.steps
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d\./.test(line))
      .map((line) => line.replace(/^\d\.\s*/, '')),
    pattern: raw.pat,
    sample1: { jp: raw.a1, vn: raw.n1 },
    sample2: { jp: raw.a2, vn: raw.n2 },
    trapCues: splitBullets(raw.trap, /^•\s*/),
    pronCues: splitBullets(raw.pron, /^•\s*/),
    judge: raw.j,
    ladder: raw.lad,
    raw,
  };
}

export function normalizeFreeQuestion(
  raw: RawFreeQuestion,
  bai: number,
  index: number,
): FreeQuestion {
  return {
    kind: 'free',
    id: raw.id,
    bai,
    index,
    topicCode: raw.chu_de,
    title: raw.ten_chu_de,
    questionForm: raw.dang_hoi,
    questionRead: raw.cau_hoi_doc,
    meaningVn: raw.nghia_vn,
    pattern: raw.cau_truc,
    vocabList: raw.tu_vung
      .split('；')
      .map((x) => x.trim())
      .filter(Boolean),
    sample1: { jp: raw.tra_loi_1, vn: raw.nghia_1 },
    sample2: { jp: raw.tra_loi_2, vn: raw.nghia_2 },
    checklistInfo: raw.tu_soat_thong_tin,
    checklistNote: raw.tu_soat_nhac,
    raw,
  };
}

export function normalizeReadingPassage(
  raw: RawReadingPassage,
  bai: number,
  index: number,
): ReadingPassage {
  return {
    kind: 'read',
    id: raw.id,
    bai,
    index,
    markup: raw.mk,
    hanList: raw.han,
    title: raw.title,
    newWords: raw.nw ?? [],
    raw,
  };
}

export function normalizeLessonBundle(bundle: LessonBundle): LessonData {
  return {
    bai: bundle.bai,
    pic: bundle.pic.map((q, i) => normalizePicQuestion(q, bundle.bai, i + 1)),
    free: bundle.free.map((q, i) => normalizeFreeQuestion(q, bundle.bai, i + 1)),
    read: bundle.read.map((p, i) => normalizeReadingPassage(p, bundle.bai, i + 1)),
  };
}
