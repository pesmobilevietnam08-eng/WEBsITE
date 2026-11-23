import type { ScaleItem, ScaleMap } from '../data/schema';
import type { ScoreLabel } from './types';

/** Fallback display description for upstream R9 code documented in docs/DATA-REPORT.md */
export const R9_FALLBACK_SCALE: ScaleItem = {
  name: 'Sai ngữ pháp hoàn toàn (câu hỏi ます mà trả lời bằng danh từ＋です)',
  pen: '−10',
  ex: 'Câu hỏi dùng động từ (～ますか) cần trả lời bằng động từ ～ます, không trả lời bằng danh từ + です.',
};

export function getScaleItem(scale: ScaleMap, code: string): ScaleItem | undefined {
  if (Object.prototype.hasOwnProperty.call(scale, code)) {
    return scale[code];
  }
  if (code === 'R9') {
    return R9_FALLBACK_SCALE;
  }
  return undefined;
}

export function penOf(scale: ScaleMap, code: string): number {
  const sc = Object.prototype.hasOwnProperty.call(scale, code) ? scale[code] : undefined;
  const m = sc && String(sc.pen).match(/\d+[.,]\d+|\d+/);
  return m && m[0] ? parseFloat(m[0].replace(',', '.')) : 3;
}

export function labelOf(percent: number): ScoreLabel {
  if (percent >= 93) {
    return { text: 'Rất tốt', tone: 'good', legacyClass: 't-good' };
  }
  if (percent >= 80) {
    return { text: 'Khá ổn, chỉ cần sửa nhỏ', tone: 'mid', legacyClass: 't-mid' };
  }
  if (percent >= 60) {
    return { text: 'Cần chỉnh thêm', tone: 'mid', legacyClass: 't-mid' };
  }
  return { text: 'Chưa đạt, nghe lại và thử lần nữa', tone: 'low', legacyClass: 't-low' };
}
