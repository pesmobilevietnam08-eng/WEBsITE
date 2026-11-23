import type { CfgData, RawReadingPassage } from '../data/schema';
import { align, buildDiffTokens, classify } from './match/align';
import { MAX_READ_INPUT_LENGTH, createNormalizer } from './normalize/norm';
import { KN, hanVariants, ninK } from './normalize/numbers';
import { kataToHira, lenFix, vowelOf } from './normalize/romaji';
import type {
  PassageSegment,
  PreparedReadingPassage,
  ReadErrorItem,
  ReadGradeResult,
  ReadGroupSummary,
  RefToken,
} from './types';

const PAL: Readonly<Record<string, string>> = {
  は: 'わ',
  へ: 'え',
  を: 'お',
};

export const BRK = /[\s「」。、！？…・〜~（）()]/;

const BASE_VOC: readonly (readonly [string, string])[] = [
  ['家族', 'かぞく'],
  ['仕事', 'しごと'],
  ['父', 'ちち'],
  ['母', 'はは'],
  ['兄', 'あに'],
  ['姉', 'あね'],
  ['会社員', 'かいしゃいん'],
  ['社員', 'しゃいん'],
  ['趣味', 'しゅみ'],
  ['映画', 'えいが'],
  ['教師', 'きょうし'],
  ['先生', 'せんせい'],
  ['私', 'わたし'],
  ['誕生日', 'たんじょうび'],
  ['中国', 'ちゅうごく'],
  ['大学', 'だいがく'],
  ['学生', 'がくせい'],
  ['学校', 'がっこう'],
  ['日本語', 'にほんご'],
  ['日本人', 'にほんじん'],
  ['日本', 'にほん'],
  ['読書', 'どくしょ'],
  ['料理', 'りょうり'],
  ['好き', 'すき'],
  ['皆', 'みんな'],
  ['絵', 'え'],
  ['来ました', 'きました'],
  ['来ま', 'きま'],
  ['本が', 'ほんが'],
  ['桜', 'さくら'],
  ['田中', 'たなか'],
  ['鈴木', 'すずき'],
  ['山田', 'やまだ'],
  ['韓国人', 'かんこくじん'],
  ['韓国', 'かんこく'],
  ['宜しく', 'よろしく'],
  ['英語', 'えいご'],
  ['英国人', 'えいこくじん'],
  ['朝', 'あさ'],
  ['昼', 'ひる'],
  ['晩', 'ばん'],
  ['夜', 'よる'],
  ['ご飯', 'ごはん'],
  ['御飯', 'ごはん'],
  ['家', 'いえ'],
  ['一階', 'いっかい'],
  ['一緒に', 'いっしょに'],
  ['今', 'いま'],
  ['妹', 'いもうと'],
  ['駅', 'えき'],
  ['起き', 'おき'],
  ['贈り物', 'おくりもの'],
  ['お風呂', 'おふろ'],
  ['会社', 'かいしゃ'],
  ['買い', 'かい'],
  ['買っ', 'かっ'],
  ['帰り', 'かえり'],
  ['帰っ', 'かえっ'],
  ['方', 'かた'],
  ['楽器', 'がっき'],
  ['聞き', 'きき'],
  ['教室', 'きょうしつ'],
  ['牛乳', 'ぎゅうにゅう'],
  ['空港', 'くうこう'],
  ['国', 'くに'],
  ['散歩', 'さんぽ'],
  ['週末', 'しゅうまつ'],
  ['宿題', 'しゅくだい'],
  ['辞書', 'じしょ'],
  ['事務室', 'じむしつ'],
  ['全部', 'ぜんぶ'],
  ['体育館', 'たいいくかん'],
  ['太鼓', 'たいこ'],
  ['食べ', 'たべ'],
  ['飲み', 'のみ'],
  ['卵', 'たまご'],
  ['父', 'ちち'],
  ['中国語', 'ちゅうごくご'],
  ['中国人', 'ちゅうごくじん'],
  ['使い', 'つかい'],
  ['店員', 'てんいん'],
  ['店', 'みせ'],
  ['東京', 'とうきょう'],
  ['図書館', 'としょかん'],
  ['友達', 'ともだち'],
  ['友だち', 'ともだち'],
  ['鶏肉', 'とりにく'],
  ['入り', 'はいり'],
  ['働き', 'はたらき'],
  ['花火', 'はなび'],
  ['花見', 'はなみ'],
  ['春休み', 'はるやすみ'],
  ['勉強', 'べんきょう'],
  ['本', 'ほん'],
  ['毎朝', 'まいあさ'],
  ['毎日', 'まいにち'],
  ['見ま', 'みま'],
  ['見て', 'みて'],
  ['休み', 'やすみ'],
  ['読み', 'よみ'],
  ['旅行', 'りょこう'],
  ['練習', 'れんしゅう'],
  ['行き', 'いき'],
  ['行っ', 'いっ'],
  ['行か', 'いか'],
  ['行く', 'いく'],
  ['来て', 'きて'],
  ['来', 'き'],
  ['二つ', 'ふたつ'],
  ['姉', 'あね'],
  ['兄', 'あに'],
  ['金曜日', 'きんようび'],
  ['月曜日', 'げつようび'],
  ['木曜日', 'もくようび'],
  ['土曜日', 'どようび'],
  ['日曜日', 'にちようび'],
  ['水曜日', 'すいようび'],
  ['火曜日', 'かようび'],
  ['昼ご飯', 'ひるごはん'],
  ['語', 'ご'],
  ['屋', 'や'],
];

export function segs(mk: string): PassageSegment[] {
  const out: PassageSegment[] = [];
  const re = /\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g;
  let last = 0;

  const plain = (s: string) => {
    const r = /([ァ-ヶー]+)|([^ァ-ヶー]+)/g;
    let a: RegExpExecArray | null;
    while ((a = r.exec(s))) {
      if (a[1]) out.push({ t: 'k', s: a[1] });
      else if (a[2]) out.push({ t: 'x', s: a[2] });
    }
  };

  let m: RegExpExecArray | null;
  while ((m = re.exec(mk))) {
    if (m.index > last) plain(mk.slice(last, m.index));
    if (m[1] != null && m[2] != null) {
      out.push({ t: 'h', k: m[1], y: m[2] });
    } else if (m[3] != null && m[4] != null) {
      out.push({ t: 'f', k: m[3], y: m[4] });
    }
    last = re.lastIndex;
  }
  if (last < mk.length) plain(mk.slice(last));
  return out;
}

export function splitSentences(mk: string): string[] {
  return (mk.match(/[^。]*。」?|[^。]+$/g) || [mk]).map((x) => x.trim()).filter(Boolean);
}

export function plainY(s: string): string {
  return s.replace(
    /\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g,
    (_m, _a, b: string | undefined, _c, d: string | undefined) => (b != null ? b : (d ?? '')),
  );
}

export function plainK(s: string): string {
  return s.replace(
    /\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g,
    (_m, a: string | undefined, _b, c: string | undefined) => (a != null ? a : (c ?? '')),
  );
}

export function ttsSentences(sents: readonly string[]): string[] {
  return sents.map((p) => {
    let t = plainY(p)
      .replace(/[「」]/g, '')
      .trim();
    if (/か。?$/.test(t)) t = `${t.replace(/。$/, '')}？`;
    else if (!/[。？]$/.test(t)) t += '。';
    return t;
  });
}

interface RawBuildItem {
  ph?: 'h' | 'k' | 'i';
  w?: number;
  y?: string;
  c?: string;
}

export function buildRef(mk: string, fmt = '113'): RefToken[] {
  const isF133 = fmt === '133';
  const items: RawBuildItem[] = [];
  let hw = 0;
  let kw = 0;
  for (const s of segs(mk)) {
    if (s.t === 'h') {
      items.push({ ph: 'h', w: hw++, y: s.y ?? '' });
    } else if (s.t === 'k') {
      items.push({ ph: 'k', w: kw++, y: s.s ?? '' });
    } else if (s.t === 'f') {
      items.push({ ph: 'i', y: s.y ?? '' });
    } else {
      for (const c of s.s ?? '') {
        items.push({ c });
      }
    }
  }

  const ref: RefToken[] = [];
  items.forEach((it, ix) => {
    if (it.ph) {
      let pv = '';
      for (const c0 of kataToHira(it.y ?? '')) {
        let c = c0;
        let a: string | undefined;
        if (c0 === 'ー' && pv) {
          const v = vowelOf(pv);
          if (v) {
            c = v;
            if (v === 'お') a = 'う';
            else if (v === 'え') a = 'い';
          }
        }
        ref.push({ c, g: it.ph, w: it.w, a });
        pv = c0 === 'ー' ? pv : c0;
      }
      return;
    }
    const c = it.c ?? '';
    if (BRK.test(c)) return;
    let a: string | undefined;
    if (c === 'を') {
      a = 'お';
    } else if (c === 'は' || c === 'へ') {
      const pv = items[ix - 1];
      const nx = items[ix + 1];
      const prevWord = Boolean(pv && (pv.ph || (pv.c && !BRK.test(pv.c))));
      const nextBrk = !nx || Boolean(nx.c && BRK.test(nx.c));
      if (isF133 ? prevWord : prevWord && nextBrk) {
        a = PAL[c];
      }
    }
    ref.push({ c, g: 'i', a });
  });
  return ref;
}

export function prepareReadingPassage(
  p: Pick<RawReadingPassage, 'id' | 'mk' | 'han' | 'title' | 'nw'>,
  fmt = '113',
): PreparedReadingPassage {
  const sents = (p.title ? [`「${p.title}」`] : []).concat(splitSentences(p.mk));
  const ref = buildRef(sents.join(' '), fmt);
  const tts = ttsSentences(sents);
  const nh = new Set(ref.filter((t) => t.g === 'h').map((t) => t.w)).size;
  const nk = new Set(ref.filter((t) => t.g === 'k').map((t) => t.w)).size;
  return {
    id: p.id,
    mk: p.mk,
    han: p.han,
    title: p.title,
    nw: p.nw,
    sents,
    ref,
    tts,
    nh,
    nk,
  };
}

function replaceFixedLengthKeys(
  text: string,
  lengthMap: Map<string, string>,
  keyLen: number,
): string {
  if (keyLen <= 0 || text.length < keyLen) return text;
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (i + keyLen <= text.length) {
      const slice = text.slice(i, i + keyLen);
      const hit = lengthMap.get(slice);
      if (hit !== undefined) {
        out += hit;
        i += keyLen;
        continue;
      }
    }
    out += text[i] ?? '';
    i++;
  }
  return out;
}

export function readNorm(
  p: Pick<PreparedReadingPassage, 'han' | 'ref'>,
  text: string,
  cfg: Pick<CfgData, 'kx' | 'vx' | 'vs'>,
): string {
  const { norm } = createNormalizer(cfg);
  let s = String(text || '');
  if (s.length > MAX_READ_INPUT_LENGTH) {
    s = s.slice(0, MAX_READ_INPUT_LENGTH);
  }
  s = s.normalize('NFKC');

  const voc: [string, string][] = BASE_VOC.map(([k, v]) => [k, v]);
  if (cfg.vx.length > 0) {
    const hv = new Set(voc.map((x) => x[0]));
    for (const pair of cfg.vx) {
      if (!hv.has(pair[0])) {
        voc.push([pair[0], pair[1]]);
        hv.add(pair[0]);
      }
    }
  }

  const map = new Map<string, string>();
  for (const [k, y] of p.han) {
    for (const v of hanVariants(k)) {
      if (!map.has(v)) map.set(v, y);
    }
  }
  for (const [k, v] of voc) {
    if (!map.has(k)) map.set(k, v);
  }

  const byLen = new Map<number, Map<string, string>>();
  for (const [k, v] of map.entries()) {
    const n = k.length;
    let bucket = byLen.get(n);
    if (!bucket) {
      bucket = new Map<string, string>();
      byLen.set(n, bucket);
    }
    bucket.set(k, v);
  }

  for (const n of [...byLen.keys()].sort((a, b) => b - a)) {
    const bucket = byLen.get(n);
    if (bucket) {
      s = replaceFixedLengthKeys(s, bucket, n);
    }
  }

  s = s.replace(/([一二三四五六七八九十]+)(?=人)/g, (m) => {
    let v = 0;
    let cur = 0;
    for (const c of m) {
      if (c === '十') {
        v += (cur || 1) * 10;
        cur = 0;
      } else {
        cur = cur * 10 + (KN[c] ?? 0);
      }
    }
    return String(v + cur);
  });

  s = s.replace(/(\d+)\s*人/g, (m, n: string) => ninK(+n) || m);
  s = s.replace(/([ァ-ヶー])人/g, '$1じん').replace(/こく人/g, 'こくじん');
  s = norm(s, MAX_READ_INPUT_LENGTH);
  const rs = p.ref.map((t) => t.c).join('');
  return lenFix(rs.includes('はたち') ? s : s.replace(/はたち/g, 'にじゅっさい'));
}

export function gradeRead(
  p: PreparedReadingPassage,
  text: string,
  cfg: Pick<CfgData, 'kx' | 'vx' | 'vs' | 'w' | 'partial'>,
): ReadGradeResult {
  const normText = readNorm(p, text, cfg);
  const rec = [...normText];
  const ref = p.ref;
  const st = rec.length ? align(ref, rec) : ref.map(() => ({ ok: false, j: -1 }));

  const segOf = (a: number, b: number): string => {
    let l = -1;
    let r = rec.length;
    for (let k = a - 1; k >= 0; k--) {
      const slot = st[k];
      if (slot && slot.j >= 0) {
        l = slot.j;
        break;
      }
    }
    for (let k = b + 1; k < ref.length; k++) {
      const slot = st[k];
      if (slot && slot.j >= 0) {
        r = slot.j;
        break;
      }
    }
    return rec.slice(l + 1, r).join('');
  };

  const words: Record<'h' | 'k', Map<number, number[]>> = {
    h: new Map<number, number[]>(),
    k: new Map<number, number[]>(),
  };

  ref.forEach((t, i) => {
    if (t.g === 'i' || t.w === undefined) return;
    const m = words[t.g];
    let list = m.get(t.w);
    if (!list) {
      list = [];
      m.set(t.w, list);
    }
    list.push(i);
  });

  const errs: ReadErrorItem[] = [];
  const groupRes: Record<'h' | 'k', ReadGroupSummary> = {
    h: { pct: 0, words: [], right: 0, n: 0 },
    k: { pct: 0, words: [], right: 0, n: 0 },
  };

  for (const g of ['h', 'k'] as const) {
    let sum = 0;
    const arr: { word: string; sc: number }[] = [];
    for (const [, idx] of words[g]) {
      const full =
        idx.every((i) => st[i]?.ok) &&
        idx.every((i, q) => {
          if (q === 0) return true;
          const prevIdx = idx[q - 1];
          const curSlot = st[i];
          const prevSlot = prevIdx !== undefined ? st[prevIdx] : undefined;
          return Boolean(curSlot && prevSlot && curSlot.j === prevSlot.j + 1);
        });
      const sc = full ? 1 : cfg.partial ? idx.filter((i) => st[i]?.ok).length / idx.length : 0;
      sum += sc;
      const word = idx.map((i) => ref[i]?.c ?? '').join('');
      if (sc < 1) {
        const firstIdx = idx[0] ?? 0;
        const lastIdx = idx[idx.length - 1] ?? firstIdx;
        const seg = segOf(firstIdx, lastIdx);
        errs.push({
          g,
          word,
          seg,
          lab: classify(word, seg),
          sc,
        });
      }
      arr.push({ word, sc });
    }
    groupRes[g] = {
      pct: Math.round((sum / Math.max(1, words[g].size)) * 100),
      words: arr,
      right: Math.round(sum * 10) / 10,
      n: words[g].size,
    };
  }

  const hi = ref.map((_t, i) => i).filter((i) => ref[i]?.g === 'i');
  const hok = hi.filter((i) => st[i]?.ok).length;
  const iSummary = {
    pct: Math.round((hok / Math.max(1, hi.length)) * 100),
    ok: hok,
    n: hi.length,
  };

  // Group contiguous wrong hiragana chars into clusters
  let k = 0;
  while (k < ref.length) {
    if (ref[k]?.g === 'i' && !st[k]?.ok) {
      let e = k;
      while (e + 1 < ref.length && ref[e + 1]?.g === 'i' && !st[e + 1]?.ok) {
        e++;
      }
      const a = Math.max(0, k - 1);
      const b = Math.min(ref.length - 1, e + 1);
      const word = ref
        .slice(a, b + 1)
        .map((t) => t.c)
        .join('');
      const seg = segOf(a, b);
      errs.push({
        g: 'i',
        word,
        seg,
        lab: classify(
          ref
            .slice(k, e + 1)
            .map((t) => t.c)
            .join(''),
          segOf(k, e),
        ),
        sc: 0,
        bad: [k, e],
      });
      k = e + 1;
    } else {
      k++;
    }
  }

  const total = Math.round(
    cfg.w[0] * groupRes.h.pct + cfg.w[1] * groupRes.k.pct + cfg.w[2] * iSummary.pct,
  );

  const tally: Record<string, number> = {};
  for (const err of errs) {
    for (const label of err.lab) {
      const key = label.replace(/:.*$/, '');
      tally[key] = (tally[key] ?? 0) + 1;
    }
  }

  return {
    total,
    h: groupRes.h,
    k: groupRes.k,
    i: iSummary,
    errs,
    tally,
    st,
    norm: normText,
    diff: buildDiffTokens(ref, rec, st),
  };
}
