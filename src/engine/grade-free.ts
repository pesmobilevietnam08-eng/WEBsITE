import type { CfgData, RawFreeQuestion } from '../data/schema';
import { createNormalizer } from './normalize/norm';
import type { FreeCheckItem } from './types';

const RAW_COUNTRY = [
  'ベトナム',
  'にほん',
  'ちゅうごく',
  'かんこく',
  'アメリカ',
  'イタリア',
  'オーストラリア',
  'ロシア',
  'タイ',
  'ブラジル',
  'フランス',
  'ドイツ',
  'インド',
  'イギリス',
  'スペイン',
  'カナダ',
] as const;

const RAW_JOBS = [
  'がくせい',
  'せんせい',
  'きょうし',
  'かいしゃいん',
  'しゃいん',
  'だいがく',
  'fptだいがく',
  'いしゃ',
  'かんごし',
  'エンジニア',
  'ぎんこういん',
  'こうむいん',
  'てんいん',
] as const;

const RAW_HOBBY = [
  'サッカー',
  'テニス',
  'すいえい',
  'えいが',
  'おんがく',
  'どくしょ',
  'りょこう',
  'りょうり',
  'スポーツ',
  'しゃしん',
  'かいもの',
  'ゲーム',
  'バスケットボール',
  'バレーボール',
  'うた',
  'ダンス',
  'さんぽ',
  'ジョギング',
] as const;

const RAW_BRAND = [
  'サムスン',
  'アップル',
  'デル',
  'カシオ',
  'ナイキ',
  'ソニー',
  'トヨタ',
  'ホンダ',
  'アディダス',
  'ベトナム',
  'にほん',
  'アメリカ',
  'ちゅうごく',
  'かんこく',
  'タイ',
  'ドイツ',
  'フランス',
  'イタリア',
] as const;

const DAYW =
  /(ついたち|ふつか|みっか|よっか|いつか|むいか|なのか|ようか|ここのか|とおか|はつか|にち)/;
const VERB = /(ます|ません)$/;
const ENDOK = (u: string): boolean => /(です|ます|ません|ました|でした)$/.test(u);

const SIGS = [
  'ています',
  'ていません',
  'ましょう',
  'ませんでした',
  'ました',
  'ません',
  'ます',
  'かったです',
  'くないです',
  'じゃありません',
  'でした',
  'たいです',
  'ほしいです',
  'ことができ',
  'ことです',
  'のほうが',
  'いちばん',
  'たり',
  'にいきます',
  'くなります',
  'になります',
  'ですから',
  'ましたから',
  'から',
  'もう',
  'まだ',
  'よく',
  'あまり',
  'ぜんぜん',
  'ときどき',
  'いつも',
  'て、',
  'くて',
  'なひと',
  'ひとです',
  'ところです',
  'まちです',
  'です',
] as const;

const COUNTQ: readonly (readonly [RegExp, RegExp])[] = [
  [/なんにん/, /(にん|ひとり|ふたり)/],
  [/なんさい/, /(さい|はたち)/],
  [/なんかい/, /かい/],
  [/なんびき/, /(ひき|ぴき|びき)/],
  [/なんがつ/, /がつ/],
  [/いくら/, /(えん|どる)/],
  [/なんじ/, /じ/],
  [/どのくらい/, /(じかん|ふん|ぷん|くらい)/],
  [/ごはんをたべ|なんぼん|なんまい/, /./],
];

const anyIn = (u: string, list: readonly string[]): boolean => list.some((w) => u.includes(w));

export function genericFree(
  q: RawFreeQuestion,
  u: string,
  norm: (s: string) => string,
): [boolean, boolean] {
  const qs = norm(q.cau_hoi_doc || '');
  let info = u.replace(/(です|ます|ました|ません)/g, '').length >= 2;
  for (const [a, b] of COUNTQ) {
    if (a.test(qs)) {
      info = info && b.test(u);
      break;
    }
  }
  if (/^YN/.test(q.dang_hoi || '')) {
    info =
      /^(はい|いいえ|ええ|いえ|そうです|ちがいます|いいですね|すみません|ざんねん)/.test(u) || info;
  }
  const model = [q.tra_loi_1, q.tra_loi_2].filter(Boolean).map((s) => norm(s));
  const need = SIGS.filter((s) => model.some((m) => m.includes(s)) && s !== 'です' && s !== 'から');
  const st = need.length ? need.some((s) => u.includes(s)) : ENDOK(u);
  return [info, info && st];
}

export function gradeFree(
  q: RawFreeQuestion,
  text: string,
  cfg: Pick<CfgData, 'code' | 'kx' | 'vs'>,
): FreeCheckItem[] {
  const { norm } = createNormalizer(cfg);
  const COUNTRY = RAW_COUNTRY.map((x) => norm(x));
  const JOBS = RAW_JOBS.map((x) => norm(x));
  const HOBBY = RAW_HOBBY.map((x) => norm(x));
  const BRAND = RAW_BRAND.map((x) => norm(x));

  const OK_END =
    cfg.code === 'JPD113'
      ? /(です|ます|でした|ました|ません|ください)$/
      : /(です|ます|でした|ました|ません|ください|から|ましょう|ましょうか)(ね|よ)?$/;

  const okEnd = (u: string): boolean =>
    OK_END.test(u) || /(から|ちょっと|ましょう|ですね|ますね|ください|ですよ|ますよ)$/.test(u);

  const u = norm(text);
  const c = q.chu_de;
  const yn = /^YN/.test(q.dang_hoi);

  let r: [boolean, boolean];
  if (c === 'L26') {
    r = [
      /(いいですね|すみません|ざんねん|ちょっと|ぜひ|はい)/.test(u),
      /(ましょう|ちょっと|ありますから|ようじ|ざんねん)/.test(u),
    ];
  } else if (yn) {
    const a = /^(はい|いいえ|いえ|そうです|ちがいます|ええ)/.test(u);
    r = [a, a && (/^(はい|ええ|そうです)/.test(u) ? ENDOK(u) : ENDOK(u) || /ちがいます/.test(u))];
  } else if (c === 'L01') {
    r = [
      u.replace(/(わたしは|わたしの|おなまえは|なまえは|です|ます)/g, '').length >= 1,
      /です$/.test(u),
    ];
  } else if (c === 'L02') {
    r = [anyIn(u, COUNTRY), anyIn(u, COUNTRY) && /です$/.test(u)];
  } else if (c === 'L03') {
    r = [anyIn(u, JOBS), anyIn(u, JOBS) && /です$/.test(u)];
  } else if (c === 'L04') {
    r = [/(さい|はたち)/.test(u), /(さい|はたち)です$/.test(u)];
  } else if (c === 'L05') {
    r = [/がつ/.test(u) && DAYW.test(u), u.includes('がつ') && u.endsWith('です')];
  } else if (c === 'L06') {
    r = [anyIn(u, HOBBY), (anyIn(u, HOBBY) || /しゅみ/.test(u)) && /です$/.test(u)];
  } else if (c === 'L07') {
    r = [
      /(かい|がい|ここ|そこ|あそこ)/.test(u),
      /(かい|がい|ここ|そこ|あそこ)/.test(u) && u.endsWith('です'),
    ];
  } else if (c === 'L08') {
    r = [/(えん|どる|どん)/.test(u), /(えん|どる|どん)です$/.test(u)];
  } else if (c === 'L09') {
    r = [u.replace(/(です|の)/g, '').length >= 2, /です$/.test(u)];
  } else if (c === 'L10') {
    r = [anyIn(u, BRAND) || /の/.test(u), (anyIn(u, BRAND) || /の/.test(u)) && /です$/.test(u)];
  } else if (c === 'L11') {
    r = [
      /(じ|ふん|ぷん|ようび|がつ|にち|はつか|ついたち|ふつか|みっか|よっか|いつか|むいか|なのか|ようか|ここのか|とおか)/.test(
        u,
      ),
      /(から.*まで|まで)/.test(q.cau_hoi_doc)
        ? (u.includes('から') && u.includes('まで')) ||
          (!/から/.test(q.cau_hoi_doc) && u.includes('まで'))
        : ENDOK(u),
    ];
  } else if (c === 'L12' || c === 'L13') {
    r = [
      VERB.test(u) || /(を|へ|に)/.test(u),
      VERB.test(u) &&
        (/(を|へ|に|で|や)/.test(u) || /ません$/.test(u) || /(べんきょう|りょこう|さんぽ)/.test(u)),
    ];
  } else {
    r = genericFree(q, u, norm);
  }

  const pl = q.cau_truc;
  return [
    {
      ok: Boolean(u) && Boolean(r[0]),
      t: q.tu_soat_thong_tin,
      note: q.tu_soat_nhac,
    },
    {
      ok: Boolean(u) && Boolean(r[1]),
      t: `Cấu trúc: ${pl}`,
      note: `Thử nói theo mẫu: ${pl}`,
    },
    {
      ok: Boolean(u) && okEnd(u),
      t: 'Có đuôi lịch sự (です／ます／ません)',
      note: 'Máy chưa nghe thấy đuôi lịch sự です／ます. Em nghe lại câu gợi ý nhé.',
    },
  ];
}
