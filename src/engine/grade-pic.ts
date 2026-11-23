import type { RawPicQuestion } from '../data/schema';
import {
  ALT7,
  PAST,
  PRES,
  SAME,
  UNIT,
  fixParticles,
  fuzzy,
  has,
  lastTok,
  partOf,
  repOK,
  ynTruth,
} from './match/fuzzy';
import { createNormalizer } from './normalize/norm';
import { penOf } from './scale';
import type { GradePicContext, PicDeductionItem, PicGradeResult } from './types';

const MARK = (g: readonly string[]): boolean =>
  g.length === 1 && (g[0] === 'ごぜん' || g[0] === 'ごご');

const TENSE = (w: string): string[] => {
  if (/ます$/.test(w)) return [`${w.slice(0, -2)}ました`];
  if (/です$/.test(w)) return [`${w.slice(0, -2)}でした`];
  if (/ました$/.test(w)) return [`${w.slice(0, -3)}ます`];
  if (/でした$/.test(w)) return [`${w.slice(0, -3)}です`];
  return [];
};

const lexCache = new WeakMap<readonly RawPicQuestion[], readonly string[]>();

function getLexicon(
  allPicQuestions: readonly RawPicQuestion[],
  norm: (s: string) => string,
): readonly string[] {
  const cached = lexCache.get(allPicQuestions);
  if (cached) return cached;
  const set = new Set<string>();
  for (const q of allPicQuestions) {
    for (const grp of q.j.need || []) {
      for (const word of grp) {
        set.add(norm(word));
      }
    }
  }
  const excluded = new Set(['はい', 'いいえ', 'ある', 'いる', 'する', 'して', 'できる']);
  const lex = [...set].filter(
    (w) =>
      w.length >= 2 &&
      !/さん$/.test(w) &&
      !/(ます|ません|ました|ています|です|ほう)$/.test(w) &&
      !excluded.has(w),
  );
  lexCache.set(allPicQuestions, lex);
  return lex;
}

interface MatchPos {
  i: number;
  w: string;
  len: number;
}

export function gradePic(
  q: RawPicQuestion,
  text: string,
  ctx: GradePicContext,
  skip = false,
): PicGradeResult {
  const { cfg, scale, allPicQuestions } = ctx;
  const { norm } = createNormalizer(cfg);

  const OK_END =
    cfg.code === 'JPD113'
      ? /(です|ます|でした|ました|ません|ください)$/
      : /(です|ます|でした|ました|ません|ください|から|ましょう|ましょうか)(ね|よ)?$/;

  const u0 = norm(text);
  const u = fixParticles(q, u0, norm);
  const L = q.lad;
  const j = q.j;

  const row = (code: string, why?: string): PicDeductionItem => {
    const r = L.find((x) => x.c === code);
    if (r) {
      return { c: code, pen: 15 - r.s, why: r.why, hint: r.hint };
    }
    const sc = Object.prototype.hasOwnProperty.call(scale, code) ? scale[code] : undefined;
    return {
      c: code,
      pen: penOf(scale, code),
      why: why || sc?.name || '',
      hint: sc?.ex || '',
    };
  };

  const done = (arr: PicDeductionItem[]): PicGradeResult => {
    const zero = arr.some((x) => x.c === 'R0' || x.c === 'R1' || x.c === 'R2');
    const pen = arr.reduce((a, x) => a + x.pen, 0);
    const s = zero ? 0 : Math.max(0, Math.round((15 - pen) * 10) / 10);
    return { s, p: Math.round((s / 15) * 100), items: arr, zero };
  };

  const full = (): PicGradeResult => {
    const r = L.find((x) => x.s === 15);
    return { s: 15, p: 100, items: [], ok: r?.hint };
  };

  if (!u || /^(わかりません|わからない|しらない)/.test(u)) {
    return done([row('R0')]);
  }

  if (!skip) {
    for (const r of L) {
      if (r.a && r.a[0] !== '(' && (norm(r.a) === u || norm(r.a) === u0)) {
        if (r.s === 15) return full();
        const z = r.c === 'R0' || r.c === 'R1' || r.c === 'R2';
        return {
          s: z ? 0 : r.s,
          p: z ? 0 : Math.round((r.s / 15) * 100),
          items: [{ c: r.c ?? 'R0', pen: 15 - r.s, why: r.why, hint: r.hint }],
          zero: z,
        };
      }
    }
    if ((j.accept || []).some((a) => norm(a) === u || norm(a) === u0)) {
      return full();
    }
  }

  if (
    L.some((x) => x.c === 'R9b') &&
    /^(はい|ええ|いいえ)?(そうです|ちがいます|そうじゃありません)?$/.test(u) &&
    /^(はい|ええ|いいえ|そう|ちがい)/.test(u)
  ) {
    return done([row('R9b')]);
  }

  const needs = (j.need || []).map((g) => g.map((x) => norm(x)));
  const predTok = [lastTok(q.a1), lastTok(q.a2)].map((x) => norm(x)).filter(Boolean);
  const isPred = (w: string): boolean =>
    predTok.some((p) => {
      const st = p.replace(/(ませんでした|ました|ません|ます)$/, '');
      return p.includes(w) || (st.length >= 2 && w.includes(st));
    });

  const samples = [
    q.a1,
    q.a2,
    ...(j.accept || []),
    ...L.filter((x) => x.s === 15 && x.a && x.a[0] !== '(').map((x) => x.a),
  ].map((s) => norm(s));

  if (j.kind === 'YN') {
    const tv = ynTruth(j.truth);
    if (tv) {
      const yes = /^(はい|ええ|うん|そう)/.test(u);
      const no = /^(いいえ|いえ|ちがい)/.test(u);
      if (!yes && !no) return done([row('R3')]);
      if (yes !== (tv === 'yes')) return done([row('R2')]);
      if (!needs.length) return OK_END.test(u) ? full() : done([row('R4')]);
    }
  }

  if (!needs.length) return done([row('R2')]);

  const items: PicDeductionItem[] = [];
  const add = (code: string, why?: string) => {
    if (!items.some((x) => x.c === code)) {
      items.push(row(code, why));
    }
  };

  const pos: (MatchPos | null)[] = needs.map((g) => {
    for (const w of g) {
      const i = has(u, w);
      if (i >= 0) return { i, w, len: w.length };
    }
    return null;
  });

  if (cfg.code !== 'JPD113') {
    needs.forEach((g, k) => {
      if (pos[k]) return;
      for (const w of g) {
        for (const alt of TENSE(w)) {
          const i = has(u, alt);
          if (i >= 0) {
            pos[k] = { i, w: alt, len: alt.length };
            return;
          }
        }
      }
    });
  }

  needs.forEach((g, k) => {
    if (pos[k]) return;
    for (const w of g) {
      for (const alt of ALT7[w] || []) {
        const i = has(u, alt);
        if (i >= 0) {
          pos[k] = { i, w: alt, len: alt.length };
          add('R7a');
          return;
        }
      }
    }
  });

  // Fuzzy match for hiragana words only
  needs.forEach((g, k) => {
    if (pos[k]) return;
    for (let wi = 0; wi < g.length; wi++) {
      const w = g[wi];
      if (!w) continue;
      const rawWord = j.need[k]?.[wi] || '';
      if (/[ァ-ヶ一-龯]/.test(rawWord)) continue;
      const i = fuzzy(u, w);
      if (i >= 0) {
        pos[k] = { i, w, len: w.length };
        add('R7a');
        break;
      }
    }
  });

  const miss = needs.map((_g, k) => (pos[k] ? -1 : k)).filter((k) => k >= 0);

  if (miss.length === needs.length) {
    const vb = lastTok(q.a1);
    if (vb && u === norm(vb) && /(ます|ません)$/.test(vb)) {
      return done([row('R6b', 'Thiếu một thông tin theo tranh')]);
    }
    const firstNeed = needs[0] ?? [];
    const stemOK =
      needs.length === 1 &&
      firstNeed.some((w) => {
        const m = w.match(UNIT);
        return Boolean(
          m && w.length - m[0].length >= 2 && u.includes(w.slice(0, w.length - m[0].length)),
        );
      });
    if (!stemOK) return done([row('R2')]);
  }

  if (miss.length) {
    const found = pos.filter((p): p is MatchPos => p !== null).map((p) => p.w);
    let rest = u;
    for (const w of found) {
      rest = rest.replace(w, '');
    }
    const mm = miss.filter((k) => !MARK(needs[k] ?? []));
    if (!mm.length) {
      add('R6b', 'Thiếu một thông tin theo tranh');
    } else {
      const unitMiss = mm.some((k) => {
        const w = needs[k]?.[0] ?? '';
        const m = w.match(UNIT);
        return Boolean(
          m && w.length - m[0].length >= 2 && u.includes(w.slice(0, w.length - m[0].length)),
        );
      });
      const wrongVal = mm.some((k) => {
        const w = needs[k]?.[0] ?? '';
        const m = w.match(UNIT);
        if (!m) return false;
        const eq = m[0] === 'ぷん' || m[0] === 'ふん' ? ['ぷん', 'ふん'] : [m[0]];
        return eq.some((x) => rest.includes(x));
      });
      const own = needs.flat();
      const lexWords = getLexicon(allPicQuestions, norm);
      const wrongLex = lexWords.some(
        (w) => rest.includes(w) && !own.some((n) => n.includes(w) || w.includes(n)),
      );
      const sample0 = samples[0] ?? '';
      const verbAns = /(ませんでした|ました|ません|ます)$/.test(sample0);
      const predMiss = verbAns && OK_END.test(u) && /です(ね|よ)?$/.test(u);
      const predBare = !OK_END.test(u) && mm.every((k) => (needs[k] ?? []).some(isPred));
      const hoMiss =
        mm.some((k) => (needs[k] ?? []).includes('ほう')) &&
        OK_END.test(u) &&
        (L.some((x) => x.c === 'R5g') || Boolean(scale.R5g));

      if (unitMiss) add('R6a');
      else if (hoMiss) add('R5g');
      else if (predMiss && (L.some((x) => x.c === 'R5f') || Boolean(scale.R5f))) add('R5f');
      else if (wrongVal || wrongLex) add('R2');
      else if (predBare && (L.some((x) => x.c === 'R4') || Boolean(scale.R4))) add('R4');
      else add('R6b', 'Thiếu một thông tin theo tranh');
    }
    return done(items);
  }

  // Time range ordering (から–まで)
  if (/^(HOURS|KHOANG|TIME)/.test(j.typ || '')) {
    const sm = norm(q.a1);
    const order = needs
      .map((g, k) => ({
        k,
        i: g.map((w) => sm.indexOf(w)).find((x) => x >= 0),
      }))
      .filter((x): x is { k: number; i: number } => x.i !== undefined)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.k);
    const vals = order.filter((k) => !MARK(needs[k] ?? []));
    const inv = (arr: number[]) =>
      arr.some((k, t) => {
        if (!t) return false;
        const curPos = pos[k];
        const prevPos = pos[arr[t - 1] ?? -1];
        return Boolean(curPos && prevPos && curPos.i < prevPos.i);
      });
    if (inv(vals)) return done([row('R2')]);
    if (inv(order)) add('R2b');
  }

  if (j.typ === 'ORDER' && needs.length === 4) {
    const P = pos.map((p) => p?.i ?? 0);
    const p0 = P[0] ?? 0;
    const p1 = P[1] ?? 0;
    const p2 = P[2] ?? 0;
    const p3 = P[3] ?? 0;
    const A: [number, number] = [Math.min(p0, p1), Math.max(p0, p1)];
    const Bq: [number, number] = [Math.min(p2, p3), Math.max(p2, p3)];
    if (!(A[1] < Bq[0] || Bq[1] < A[0])) {
      return done([row('R2')]);
    }
  }

  if (/じん/.test(u) && L.some((x) => x.c === 'R11')) {
    add('R11');
  }

  // Particles compared against sample answers
  const allowed = new Set<string>();
  for (const g of needs) {
    for (const sm of samples) {
      for (const w of g) {
        const i = sm.indexOf(w);
        if (i >= 0) {
          const pc = partOf(sm.slice(i + w.length));
          if (pc) {
            allowed.add(pc);
            for (const x of (SAME[pc] || '').split('')) {
              if (x) allowed.add(x);
            }
          }
        }
      }
    }
  }

  if (allowed.size) {
    const starts = needs.flat();
    needs.forEach((_g, k) => {
      const slot = pos[k];
      if (!slot) return;
      const { i, w } = slot;
      const c = u[i + w.length];
      const rest = u.slice(i + w.length);
      if (/^(ね|よ)?$/.test(rest)) return;
      const pc = partOf(rest);
      if (pc) {
        if (!allowed.has(pc) && !/^も/.test(rest.slice(1))) {
          add('R5b');
        }
      } else if (
        c &&
        !starts.some((x) => rest.startsWith(x)) &&
        !rest.startsWith('から') &&
        !rest.startsWith('ください') &&
        !rest.startsWith('と') &&
        !rest.startsWith('まで') &&
        !rest.startsWith('も') &&
        !OK_END.test(rest) &&
        ![...allowed].some((x) => rest.includes(x)) &&
        !/^(さん|いん|たち|ちゃん|くん|じん)/.test(rest) &&
        !samples.some((sm) => sm.includes(w + rest))
      ) {
        add('R5a');
      } else if (
        c &&
        OK_END.test(rest) &&
        rest.length <= 4 &&
        !rest.startsWith('です') &&
        !rest.startsWith('ます') &&
        !rest.startsWith('ください') &&
        !/^(さん|いん|たち|ちゃん|くん|じん)/.test(rest) &&
        !isPred(w) &&
        !samples.some((sm) => sm.includes(w + rest))
      ) {
        add('R5a');
      }
    });

    if (!items.some((x) => x.c === 'R5a' || x.c === 'R5b')) {
      const last = pos[pos.length - 1];
      if (last) {
        const rest = u.slice(last.i + last.len);
        if (
          rest &&
          /^(み|た|の|よ|い|し|べ|か|お|ね|は)/.test(rest) &&
          /ます|ません/.test(rest) &&
          ![...allowed].some((x) => rest.startsWith(x)) &&
          !isPred(last.w) &&
          !samples.some((sm) => sm.includes(last.w + rest))
        ) {
          add('R5a');
        }
      }
    }
  }

  const a = samples[0] ?? '';
  if (/から/.test(a) && !u.includes('から')) add('R5a', 'Thiếu から');
  if (/まで/.test(a) && !u.includes('まで')) add('R5a', 'Thiếu まで');

  if (
    L.some((x) => x.c === 'R9') &&
    /(ます|ません)$/.test(a) &&
    /です$/.test(u) &&
    !/(ます|ません)/.test(u)
  ) {
    return done([row('R9')]);
  }

  if (
    j.rep &&
    j.rep.length &&
    OK_END.test(u) &&
    !j.rep.some((r) => repOK(u, r, norm)) &&
    (L.some((x) => x.c === 'R5f') || Boolean(scale.R5f))
  ) {
    add('R5f');
  }

  if (L.some((x) => x.c === 'R5e') || Boolean(scale.R5e)) {
    const qs = norm(q.read || '');
    const qPast = /(ました|ませんでした|でした|かったです)か$/.test(qs);
    const qPres = (/(ます|ません)か$/.test(qs) || /(?<!でした)です?か$/.test(qs)) && !qPast;
    if (
      !/(まだ|もう)/.test(u) &&
      ((qPast && PRES.test(u) && !PAST.test(u)) || (qPres && PAST.test(u)))
    ) {
      add('R5e');
    }
  }

  if (!OK_END.test(u)) add('R4');

  return items.length ? done(items) : full();
}
