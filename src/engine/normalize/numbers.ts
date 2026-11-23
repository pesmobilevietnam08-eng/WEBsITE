export const KN: Readonly<Record<string, number>> = {
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const D1 = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'] as const;

export function parseKanjiNumeralString(m: string): number {
  let v = 0;
  let cur = 0;
  const units: Readonly<Record<string, number>> = {
    十: 10,
    百: 100,
    千: 1000,
  };
  for (const c of m) {
    if (c in KN) {
      cur = cur * 10 + (KN[c] ?? 0);
    } else if (c in units) {
      v += (cur || 1) * (units[c] ?? 1);
      cur = 0;
    } else if (c === '万') {
      v = (v + cur || 1) * 10000;
      cur = 0;
    }
  }
  return v + cur;
}

export function kanjiNum(t: string): string {
  return t.replace(
    /(?<!\d)([〇一二三四五六七八九十百千万]{1,12})(?=月|日|歳|才|さい|がつ|にち|時|分|階|円|つ|ドル|ドン)/g,
    (m) => String(parseKanjiNumeralString(m)),
  );
}

export function monthK(n: number): string | null {
  const m: Readonly<Record<number, string>> = {
    1: 'いち',
    2: 'に',
    3: 'さん',
    4: 'し',
    5: 'ご',
    6: 'ろく',
    7: 'しち',
    8: 'はち',
    9: 'く',
    10: 'じゅう',
    11: 'じゅういち',
    12: 'じゅうに',
  };
  const prefix = m[n];
  return prefix ? `${prefix}がつ` : null;
}

export function dayK(n: number): string | null {
  const sp: Readonly<Record<number, string>> = {
    1: 'ついたち',
    2: 'ふつか',
    3: 'みっか',
    4: 'よっか',
    5: 'いつか',
    6: 'むいか',
    7: 'なのか',
    8: 'ようか',
    9: 'ここのか',
    10: 'とおか',
    14: 'じゅうよっか',
    20: 'はつか',
    24: 'にじゅうよっか',
  };
  if (sp[n]) return sp[n] ?? null;
  if (n < 1 || n > 31) return null;
  const t = Math.floor(n / 10);
  const o = n % 10;
  const od = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'しち', 'はち', 'く'] as const;
  const tp = (['', 'じゅう', 'にじゅう', 'さんじゅう'] as const)[t] ?? '';
  return `${tp}${od[o] ?? ''}にち`;
}

export function ageK(n: number): string | null {
  if (n === 20) return 'はたち';
  if (n < 1 || n > 99) return null;
  const t = Math.floor(n / 10);
  const o = n % 10;
  const un = ['', 'いっ', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はっ', 'きゅう'] as const;
  if (o === 0) {
    return `${t === 1 ? 'じゅっ' : `${D1[t] ?? ''}じゅっ`}さい`;
  }
  const tp = t === 0 ? '' : t === 1 ? 'じゅう' : `${D1[t] ?? ''}じゅう`;
  return `${tp}${un[o] ?? ''}さい`;
}

export function hourK(n: number): string | null {
  const h: Readonly<Record<number, string>> = {
    1: 'いち',
    2: 'に',
    3: 'さん',
    4: 'よ',
    5: 'ご',
    6: 'ろく',
    7: 'しち',
    8: 'はち',
    9: 'く',
    10: 'じゅう',
    11: 'じゅういち',
    12: 'じゅうに',
  };
  const prefix = h[n];
  return prefix ? `${prefix}じ` : null;
}

export function minK(n: number): string | null {
  if (n < 0 || n > 99) return null;
  const t = Math.floor(n / 10);
  const o = n % 10;
  const u = [
    '',
    'いっぷん',
    'にふん',
    'さんぷん',
    'よんぷん',
    'ごふん',
    'ろっぷん',
    'ななふん',
    'はっぷん',
    'きゅうふん',
  ] as const;
  if (o === 0) {
    return t === 0 ? '' : `${t === 1 ? '' : (D1[t] ?? '')}じゅっぷん`;
  }
  const tp = t === 0 ? '' : t === 1 ? 'じゅう' : `${D1[t] ?? ''}じゅう`;
  return `${tp}${u[o] ?? ''}`;
}

export function kaiK(n: number): string | null {
  const m: Readonly<Record<number, string>> = {
    1: 'いっかい',
    2: 'にかい',
    3: 'さんがい',
    4: 'よんかい',
    5: 'ごかい',
    6: 'ろっかい',
    7: 'ななかい',
    8: 'はっかい',
    9: 'きゅうかい',
    10: 'じゅっかい',
  };
  return m[n] ?? null;
}

export function numK(n: number): string {
  if (!Number.isFinite(n) || n <= 0 || n >= 100_000_000) return '';
  let s = '';
  const man = Math.floor(n / 10000);
  const r = n % 10000;
  if (man) {
    s += `${man === 1 ? 'いち' : numK(man)}まん`;
  }
  const th = Math.floor(r / 1000);
  const h = Math.floor((r % 1000) / 100);
  const te = Math.floor((r % 100) / 10);
  const o = r % 10;
  if (th) {
    s += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : `${D1[th] ?? ''}せん`;
  }
  if (h) {
    s +=
      h === 1
        ? 'ひゃく'
        : h === 3
          ? 'さんびゃく'
          : h === 6
            ? 'ろっぴゃく'
            : h === 8
              ? 'はっぴゃく'
              : `${D1[h] ?? ''}ひゃく`;
  }
  if (te) {
    s += te === 1 ? 'じゅう' : `${D1[te] ?? ''}じゅう`;
  }
  if (o) {
    s += D1[o] ?? '';
  }
  return s;
}

export function tsuK(n: number): string | null {
  const list = [
    '',
    'ひとつ',
    'ふたつ',
    'みっつ',
    'よっつ',
    'いつつ',
    'むっつ',
    'ななつ',
    'やっつ',
    'ここのつ',
    'とお',
  ] as const;
  return list[n] || null;
}

export function digitToKanji(n: number): string {
  const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
  if (n < 10) return d[n] ?? '';
  if (n < 20) return `十${d[n - 10] ?? ''}`;
  return `${d[Math.floor(n / 10)] ?? ''}十${d[n % 10] ?? ''}`;
}

export function hanVariants(k: string): string[] {
  const v = new Set<string>([k]);
  v.add(k.replace(/\d+/g, (m) => digitToKanji(+m)));
  v.add(k.replace(/[〇一二三四五六七八九十百千万]+/g, (m) => String(parseKanjiNumeralString(m))));
  for (const x of [...v]) {
    v.add(x.replace(/才/g, '歳'));
  }
  return [...v];
}

export function ninK(n: number): string | null {
  const sp: Readonly<Record<number, string>> = {
    1: 'ひとり',
    2: 'ふたり',
    3: 'さんにん',
    4: 'よにん',
    5: 'ごにん',
    6: 'ろくにん',
    7: 'ななにん',
    8: 'はちにん',
    9: 'きゅうにん',
    10: 'じゅうにん',
  };
  if (sp[n]) return sp[n] ?? null;
  const k = numK(n);
  return k ? `${k}にん` : null;
}
