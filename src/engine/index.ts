import type { DisplaySpan } from './types';

export * from './types';
export { getScaleItem, labelOf, penOf, R9_FALLBACK_SCALE } from './scale';
export {
  ageK,
  dayK,
  digitToKanji,
  hanVariants,
  hourK,
  kaiK,
  kanjiNum,
  KN,
  minK,
  monthK,
  ninK,
  numK,
  parseKanjiNumeralString,
  tsuK,
} from './normalize/numbers';
export { kataToHira, lenFix, romajiText, romaToKana, vowelOf } from './normalize/romaji';
export {
  createNormalizer,
  MAX_QA_INPUT_LENGTH,
  MAX_READ_INPUT_LENGTH,
  type Normalizer,
} from './normalize/norm';
export {
  ALT7,
  fixParticles,
  fuzzy,
  has,
  lastTok,
  lev,
  PART,
  PARTMAP,
  partOf,
  repOK,
  SAME,
  ynTruth,
} from './match/fuzzy';
export { align, buildDiffTokens, classify, ops } from './match/align';
export { gradePic } from './grade-pic';
export { genericFree, gradeFree } from './grade-free';
export {
  BRK,
  buildRef,
  gradeRead,
  plainK,
  plainY,
  prepareReadingPassage,
  readNorm,
  segs,
  splitSentences,
  ttsSentences,
} from './grade-read';

/** Replaces leading "A" placeholder in Japanese question text with learner's sanitized display name */
export function formatQuestionText(rawQuestion: string, learnerName: string): string {
  const safeName = learnerName.trim() || 'ミン';
  return rawQuestion.replace(/^A/, safeName);
}

/** Splits 【highlighted】 markers into structured React-safe spans (never emits HTML) */
export function parseDisplayHighlight(disp: string): DisplaySpan[] {
  const spans: DisplaySpan[] = [];
  const re = /【(.+?)】/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(disp))) {
    if (m.index > last) {
      spans.push({ text: disp.slice(last, m.index), mark: false });
    }
    if (m[1]) {
      spans.push({ text: m[1], mark: true });
    }
    last = re.lastIndex;
  }
  if (last < disp.length) {
    spans.push({ text: disp.slice(last), mark: false });
  }
  return spans;
}

/** Splits spoken QA sentences and adds rising intonation question mark after か */
export function splitSpokenQuestion(text: string): string[] {
  return String(text)
    .replace(/[「」]/g, '')
    .split(/(?<=[。？?])/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const trimmed = x.replace(/[。？?]+$/, '');
      return /か$/.test(trimmed) ? `${trimmed}？` : `${trimmed}。`;
    });
}
