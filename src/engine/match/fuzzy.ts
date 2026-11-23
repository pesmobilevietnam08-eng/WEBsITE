import type { RawPicQuestion } from '../../data/schema';

export const PART = 'をへにがのとやは';

export const SAME: Readonly<Record<string, string>> = {
  へ: 'へに',
  に: 'へに',
  や: 'やと',
  と: 'やと',
};

export const PARTMAP: Readonly<Record<string, string>> = {
  わ: 'は',
  え: 'へ',
  お: 'を',
};

export const ALT7: Readonly<Record<string, readonly string[]>> = {
  くじ: ['きゅうじ'],
  じゅっぷん: ['じゅうぷん', 'じゅうふん', 'じゅっふん'],
  じっぷん: ['じゅうぷん'],
};

export const UNIT = /(えん|どる|どん|がい|かい|さい|じ|ふん|ぷん|がつ|にち|つ)$/;
export const PAST = /(ました|ませんでした|でした|かったです|くなかったです)(ね|よ)?$/;
export const PRES = /(ます|ません|です)(ね|よ)?$/;

export function has(u: string, w: string): number {
  let i = -1;
  while ((i = u.indexOf(w, i + 1)) >= 0) {
    const p = u.slice(Math.max(0, i - 3), i);
    if (w === 'くじ' && p.endsWith('ろ')) continue;
    if ((w === 'にじ' || w === 'いちじ' || w === 'ごじ') && p.endsWith('じゅう')) continue;
    return i;
  }
  return -1;
}

const MAX_LEV_LEN = 600;

export function lev(a: string, b: string): number {
  const sa = a.length > MAX_LEV_LEN ? a.slice(0, MAX_LEV_LEN) : a;
  const sb = b.length > MAX_LEV_LEN ? b.slice(0, MAX_LEV_LEN) : b;
  const m = sa.length;
  const n = sb.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  const row0 = d[0];
  if (row0) {
    for (let j = 1; j <= n; j++) row0[j] = j;
  }
  for (let i = 1; i <= m; i++) {
    const cur = d[i];
    const prev = d[i - 1];
    if (!cur || !prev) continue;
    for (let j = 1; j <= n; j++) {
      const del = (prev[j] ?? 0) + 1;
      const ins = (cur[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + (sa[i - 1] === sb[j - 1] ? 0 : 1);
      cur[j] = Math.min(del, ins, sub);
    }
  }
  return d[m]?.[n] ?? 0;
}

export function fuzzy(u: string, w: string): number {
  if (w.length < 4 || w.length > MAX_LEV_LEN) return -1;
  const bounded = u.length > MAX_LEV_LEN ? u.slice(0, MAX_LEV_LEN) : u;
  for (const L of [w.length - 1, w.length, w.length + 1]) {
    for (let i = 0; i + L <= bounded.length; i++) {
      if (lev(bounded.slice(i, i + L), w) <= 1) return i;
    }
  }
  return -1;
}

export function lastTok(a: string | null | undefined): string {
  const parts = String(a || '')
    .trim()
    .split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  return last.replace(/[。.]$/, '');
}

export function partOf(r: string): string | null {
  const c = r[0];
  if (!c) return null;
  if (c === 'で' && !/^(です|では|でし|でも)/.test(r)) return 'で';
  return PART.includes(c) ? c : null;
}

export function ynTruth(t: string | null | undefined): 'yes' | 'no' | null {
  if (t === 'yes' || t === 'no') return t;
  if (/^はい/.test(t || '')) return 'yes';
  if (/^いいえ/.test(t || '')) return 'no';
  return null;
}

export function repOK(u: string, r: string, normFn: (s: string) => string): boolean {
  if (r.startsWith('re:')) {
    try {
      // eslint-disable-next-line security/detect-non-literal-regexp -- trusted static rule pattern from schema-validated question data, input bounded <= 500 chars
      return new RegExp(r.slice(3)).test(u);
    } catch {
      return false;
    }
  }
  const n = normFn(r);
  const st = n.replace(/(ませんでした|ました|ません|ます)$/, '');
  return u.includes(n) || (st.length >= 2 && u.includes(st));
}

const particleCtxCache = new WeakMap<RawPicQuestion, Set<string>>();

export function fixParticles(q: RawPicQuestion, u: string, normFn: (s: string) => string): string {
  if (!/[わえお]/.test(u)) return u;
  let ctx = particleCtxCache.get(q);
  if (!ctx) {
    ctx = new Set<string>();
    const sources = [q.a1, q.a2, ...(q.j.accept || [])].filter(Boolean).map((s) => normFn(s));
    for (const s of sources) {
      for (let i = 1; i < s.length; i++) {
        const c = s[i];
        if (c === 'は' || c === 'へ' || c === 'を') {
          ctx.add(s.slice(Math.max(0, i - 2), i) + c);
        }
      }
    }
    particleCtxCache.set(q, ctx);
  }
  let o = '';
  for (let i = 0; i < u.length; i++) {
    const c = u[i] ?? '';
    const p = PARTMAP[c];
    o += p && i > 0 && ctx.has(u.slice(Math.max(0, i - 2), i) + p) ? p : c;
  }
  return o;
}
