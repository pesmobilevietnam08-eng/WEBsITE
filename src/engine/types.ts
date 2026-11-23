import type { CfgData, RawPicQuestion, ScaleMap } from '../data/schema';
import type { DiffToken } from '../ui/DiffText';

export interface ScoreLabel {
  readonly text: string;
  readonly tone: 'good' | 'mid' | 'low';
  readonly legacyClass: 't-good' | 't-mid' | 't-low';
}

export interface PicDeductionItem {
  readonly c: string;
  readonly pen: number;
  readonly why: string;
  readonly hint: string;
}

export interface PicGradeResult {
  readonly s: number;
  readonly p: number;
  readonly items: readonly PicDeductionItem[];
  readonly zero?: boolean;
  readonly ok?: string;
}

export interface FreeCheckItem {
  readonly ok: boolean;
  readonly t: string;
  readonly note: string;
}

export interface PassageSegment {
  readonly t: 'h' | 'f' | 'k' | 'x';
  readonly k?: string;
  readonly y?: string;
  readonly s?: string;
}

export interface RefToken {
  readonly c: string;
  readonly g: 'h' | 'k' | 'i';
  readonly w?: number;
  readonly a?: string;
}

export interface PreparedReadingPassage {
  readonly id: string;
  readonly mk: string;
  readonly han: readonly (readonly [string, string])[];
  readonly title?: string;
  readonly nw?: readonly (readonly [string, string, string])[];
  readonly sents: readonly string[];
  readonly ref: readonly RefToken[];
  readonly tts: readonly string[];
  readonly nh: number;
  readonly nk: number;
}

export interface AlignSlot {
  readonly ok: boolean;
  readonly j: number;
}

export interface EditOp {
  readonly t: 'sub' | 'del' | 'ins';
  readonly a?: string;
  readonly b?: string;
  readonly p?: string;
}

export interface ReadWordResult {
  readonly word: string;
  readonly sc: number;
}

export interface ReadGroupSummary {
  readonly pct: number;
  readonly words: readonly ReadWordResult[];
  readonly right: number;
  readonly n: number;
}

export interface ReadHiraganaSummary {
  readonly pct: number;
  readonly ok: number;
  readonly n: number;
}

export interface ReadErrorItem {
  readonly g: 'h' | 'k' | 'i';
  readonly word: string;
  readonly seg: string;
  readonly lab: readonly string[];
  readonly sc: number;
  readonly bad?: readonly [number, number];
}

export interface ReadGradeResult {
  readonly total: number;
  readonly h: ReadGroupSummary;
  readonly k: ReadGroupSummary;
  readonly i: ReadHiraganaSummary;
  readonly errs: readonly ReadErrorItem[];
  readonly tally: Readonly<Record<string, number>>;
  readonly st: readonly AlignSlot[];
  readonly norm: string;
  readonly diff: readonly DiffToken[];
}

export interface GradePicContext {
  readonly cfg: CfgData;
  readonly scale: ScaleMap;
  readonly allPicQuestions: readonly RawPicQuestion[];
}

export interface DisplaySpan {
  readonly text: string;
  readonly mark: boolean;
}
