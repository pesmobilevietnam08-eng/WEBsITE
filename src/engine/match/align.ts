import type { DiffToken } from '../../ui/DiffText';
import type { AlignSlot, EditOp, RefToken } from '../types';

const OROW = 'おこそとのほもよろをごぞどぼぽょ';
const EROW = 'えけせてねへめれげぜでべぺ';
const UROW = 'うくすつぬふむゆるぐずづぶぷゅ';

const DAKU = (s: string): string => s.normalize('NFD').replace(/[\u3099\u309A]/g, '');

const CONF: readonly (readonly [string, string])[] = [
  ['し', 'ち'],
  ['つ', 'す'],
  ['つ', 'ち'],
  ['ら', 'だ'],
  ['ら', 'れ'],
  ['り', 'じ'],
  ['ふ', 'ひ'],
  ['い', 'え'],
  ['お', 'う'],
  ['ん', 'む'],
];

const MAX_DP_LEN = 2500;
const MAX_CLASSIFY_SEG_LEN = 512;

export function align(ref: readonly RefToken[], rec: readonly string[]): AlignSlot[] {
  const n = Math.min(ref.length, MAX_DP_LEN);
  const m = Math.min(rec.length, MAX_DP_LEN);
  const eq = (i: number, j: number): boolean => {
    const r = ref[i];
    const c = rec[j];
    if (!r || c === undefined) return false;
    return c === r.c || (Boolean(r.a) && c === r.a);
  };

  const D: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) {
    const row = D[i];
    if (row) row[0] = i;
  }
  const row0 = D[0];
  if (row0) {
    for (let j = 0; j <= m; j++) row0[j] = j;
  }
  for (let i = 1; i <= n; i++) {
    const cur = D[i];
    const prev = D[i - 1];
    if (!cur || !prev) continue;
    for (let j = 1; j <= m; j++) {
      const del = (prev[j] ?? 0) + 1;
      const ins = (cur[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + (eq(i - 1, j - 1) ? 0 : 1);
      cur[j] = Math.min(del, ins, sub);
    }
  }

  const st: AlignSlot[] = new Array<AlignSlot>(n);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const cur = D[i];
    const prev = i > 0 ? D[i - 1] : undefined;
    if (
      i > 0 &&
      j > 0 &&
      cur &&
      prev &&
      cur[j] === (prev[j - 1] ?? 0) + (eq(i - 1, j - 1) ? 0 : 1)
    ) {
      st[i - 1] = { ok: eq(i - 1, j - 1), j: j - 1 };
      i--;
      j--;
    } else if (i > 0 && cur && prev && cur[j] === (prev[j] ?? 0) + 1) {
      st[i - 1] = { ok: false, j: -1 };
      i--;
    } else {
      j--;
    }
  }
  return st;
}

export function ops(a: readonly string[], b: readonly string[]): EditOp[] {
  const n = Math.min(a.length, MAX_DP_LEN);
  const m = Math.min(b.length, MAX_DP_LEN);
  const D: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) {
    const row = D[i];
    if (row) row[0] = i;
  }
  const row0 = D[0];
  if (row0) {
    for (let j = 0; j <= m; j++) row0[j] = j;
  }
  for (let i = 1; i <= n; i++) {
    const cur = D[i];
    const prev = D[i - 1];
    if (!cur || !prev) continue;
    for (let j = 1; j <= m; j++) {
      const del = (prev[j] ?? 0) + 1;
      const ins = (cur[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(del, ins, sub);
    }
  }

  const out: EditOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const cur = D[i];
    const prev = i > 0 ? D[i - 1] : undefined;
    if (
      i > 0 &&
      j > 0 &&
      cur &&
      prev &&
      cur[j] === (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
    ) {
      if (a[i - 1] !== b[j - 1]) {
        out.push({ t: 'sub', a: a[i - 1], b: b[j - 1], p: a[i - 2] });
      }
      i--;
      j--;
    } else if (i > 0 && cur && prev && cur[j] === (prev[j] ?? 0) + 1) {
      out.push({ t: 'del', a: a[i - 1], p: a[i - 2] });
      i--;
    } else {
      out.push({ t: 'ins', b: b[j - 1], p: b[j - 2] });
      j--;
    }
  }
  return out;
}

export function classify(r: string, s: string): string[] {
  if (!s) return ['Máy không nghe thấy chữ này'];
  const L: string[] = [];
  const add = (x: string) => {
    if (!L.includes(x)) L.push(x);
  };

  for (const o of ops(
    [...r].slice(0, MAX_CLASSIFY_SEG_LEN),
    [...s].slice(0, MAX_CLASSIFY_SEG_LEN),
  )) {
    if (o.t === 'del') {
      const ch = o.a ?? '';
      const p = o.p ?? '_';
      if ('っゃゅょ'.includes(ch)) {
        add('Thiếu っ hoặc ゃ/ゅ/ょ');
      } else if (
        ch === 'ー' ||
        (ch === 'う' && (OROW + UROW).includes(p)) ||
        (ch === 'お' && OROW.includes(p)) ||
        (ch === 'え' && EROW.includes(p)) ||
        (ch === 'い' && EROW.includes(p)) ||
        (ch === 'あ' && o.p === 'あ')
      ) {
        add('Trường âm: đọc ngắn hơn mẫu');
      } else {
        add('Thiếu chữ');
      }
    } else if (o.t === 'ins') {
      const ch = o.b ?? '';
      const p = o.p ?? '_';
      if ('っゃゅょ'.includes(ch)) {
        add('Thừa っ hoặc ゃ/ゅ/ょ');
      } else if (
        ch === 'ー' ||
        ((ch === 'う' || ch === 'お') && (OROW + UROW).includes(p)) ||
        ((ch === 'い' || ch === 'え') && EROW.includes(p))
      ) {
        add('Trường âm: đọc dài hơn mẫu');
      } else {
        add('Thừa chữ');
      }
    } else {
      const a = o.a ?? '';
      const b = o.b ?? '';
      if (DAKU(a) === DAKU(b)) {
        add(`Âm trong/đục: ${a} và ${b}`);
      } else if (
        CONF.some((pair) => (pair[0] === a && pair[1] === b) || (pair[1] === a && pair[0] === b))
      ) {
        add(`Âm hay nhầm: ${a} và ${b}`);
      } else {
        add('Khác với mẫu');
      }
    }
  }
  return L.slice(0, 2);
}

/** Builds structured DiffToken[] for UI DiffText component without emitting any HTML */
export function buildDiffTokens(
  ref: readonly RefToken[],
  rec: readonly string[],
  st: readonly AlignSlot[],
): DiffToken[] {
  const raw: DiffToken[] = [];
  const push = (type: DiffToken['type'], ch: string) => {
    const prev = raw[raw.length - 1];
    if (prev && prev.type === type) {
      raw[raw.length - 1] = { type, text: prev.text + ch };
    } else {
      raw.push({ type, text: ch });
    }
  };

  let recCursor = 0;
  for (let i = 0; i < ref.length; i++) {
    const slot = st[i];
    const token = ref[i];
    if (!token) continue;
    if (!slot || slot.j < 0) {
      push('missing', token.c);
      continue;
    }
    while (recCursor < slot.j) {
      const extraChar = rec[recCursor];
      if (extraChar !== undefined) push('extra', extraChar);
      recCursor++;
    }
    if (slot.ok) {
      push('match', token.c);
    } else {
      push('wrong', rec[slot.j] ?? token.c);
    }
    recCursor = slot.j + 1;
  }
  while (recCursor < rec.length) {
    const extraChar = rec[recCursor];
    if (extraChar !== undefined) push('extra', extraChar);
    recCursor++;
  }
  return raw;
}
