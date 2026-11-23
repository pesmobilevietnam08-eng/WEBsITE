import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const cfg = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'cfg.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'data.json'), 'utf8'));
const legacySrc = fs.readFileSync(path.join(rootDir, 'legacy', 'app-logic.original.js'), 'utf8');

// Minimal inert DOM stub purely to allow legacy script to initialize its pure engine functions
function makeEl() {
  return {
    hidden: false,
    textContent: '',
    innerHTML: '',
    value: '',
    checked: false,
    disabled: false,
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    setAttribute() {},
    focus() {},
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
  };
}

const sandbox = {
  CFG: structuredClone(cfg),
  DATA: structuredClone(data),
  IMG: {},
  localStorage: {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  },
  navigator: { userAgent: 'node-golden-harness', maxTouchPoints: 0 },
  location: { href: 'http://localhost/' },
  innerWidth: 1280,
  window: {
    scrollTo() {},
  },
  document: {
    body: {
      classList: { add() {}, remove() {}, toggle() {} },
    },
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    createElement: () => makeEl(),
  },
  speechSynthesis: {
    getVoices: () => [],
    cancel() {},
    speak() {},
    onvoiceschanged: null,
  },
  setTimeout,
  clearTimeout,
  console,
  __EXPORT__: {},
};

const instrumented =
  legacySrc +
  `\n;__EXPORT__ = { norm, romaToKana, romajiText, lenFix, vowelOf, gradePic, gradeFree, buildRef, readNorm, gradeRead, align, ops, classify, segs, splitS, PLAINY, PLAINK, ttsSents, labelOf, RD };`;

vm.runInNewContext(instrumented, sandbox, { filename: 'legacy/app-logic.original.js' });
const E = sandbox.__EXPORT__;

// Deterministic PRNG (Mulberry32)
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20261124);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// 1. Normalization & Romaji cases
const normSamples = [
  '',
  '   ',
  'ロシアです。',
  'roshia desu',
  'watashi wa Min desu',
  'gakkou e ikimasu',
  'terebi o mimasu',
  "kin'en desu",
  'sensei toukyou oneesan',
  'shi chi tsu fu ji si ti tu hu zi',
  '二十歳です',
  '20歳です',
  '52才',
  '三時三十分',
  '3:30',
  '9:10',
  '120分',
  '90分',
  '三千八百円',
  '3,800円',
  '2万円',
  '一万五千円',
  '3階',
  '三階',
  '3月7日',
  '九月二十日',
  '四月十日',
  '1つ 2つ 3つ 10つ',
  '日本語学校の先生です',
  '毎日ご飯を食べます',
  'ケーキを3つとコーヒーを2つください',
  '午前九時から午後五時までです',
  '時間半 2時間半',
  'サッカー・テニス！（）「」',
  'ĀĪŪĒŌ āīūēō',
  'ＦＰＴだいがく',
];

const normCases = normSamples.map((input) => ({
  input,
  norm: E.norm(input),
  romajiText: E.romajiText(input),
  romaToKana: /^[A-Za-zāīūēōĀĪŪĒŌ'’-]+$/.test(input) ? E.romaToKana(input) : null,
}));

// 2. Picture question cases: ALL lad[].a + ALL j.accept[] + synthetic edge cases
const picCases = [];
const allPicQs = cfg.bais.flatMap((b) => data.bai[String(b)].pic);

for (const q of allPicQs) {
  for (const row of q.lad) {
    if (!row.a || row.a.startsWith('(')) continue;
    picCases.push({
      id: q.id,
      kind: 'lad',
      input: row.a,
      skip: false,
      expected: E.gradePic(q, row.a, false),
    });
    // Also exercise full rule engine (skip=true) on every lad row
    picCases.push({
      id: q.id,
      kind: 'lad-rule',
      input: row.a,
      skip: true,
      expected: E.gradePic(q, row.a, true),
    });
  }
  for (const acc of q.j.accept) {
    picCases.push({
      id: q.id,
      kind: 'accept',
      input: acc,
      skip: false,
      expected: E.gradePic(q, acc, false),
    });
    picCases.push({
      id: q.id,
      kind: 'accept-rule',
      input: acc,
      skip: true,
      expected: E.gradePic(q, acc, true),
    });
  }
  // Empty and "わかりません"
  for (const edge of ['', 'わかりません', 'わからない', 'しらない']) {
    picCases.push({
      id: q.id,
      kind: 'edge',
      input: edge,
      skip: false,
      expected: E.gradePic(q, edge, false),
    });
  }
}

// 3. Free question cases: tra_loi_1, tra_loi_2 (with ○○ filled) + negative tests
const freeFillByTopic = {
  L01: 'ミン',
  L02: 'ベトナム',
  L03: 'がくせい',
  L04: 'にじゅっさい',
  L05: 'さんがつみっか',
  L06: 'サッカー',
  L07: 'いっかい',
  L08: 'ごひゃくえん',
  L09: 'にほんご',
  L10: 'ソニー',
  L11: 'くじ',
  L12: 'サッカー',
  L13: 'ごはん',
  L14: 'ハノイ',
};

const freeCases = [];
const allFreeQs = cfg.bais.flatMap((b) => data.bai[String(b)].free);
for (const q of allFreeQs) {
  const fill = freeFillByTopic[q.chu_de] || 'にほんご';
  const inputs = [
    q.tra_loi_1.replace(/○○/g, fill),
    q.tra_loi_2.replace(/○○/g, fill),
    '',
    'わかりません',
    'ベトナム',
    'はい、そうです。',
    'いいえ、ちがいます。',
  ];
  for (const input of inputs) {
    freeCases.push({
      id: q.id,
      input,
      expected: E.gradeFree(q, input),
    });
  }
}

// 4. Reading passage cases: ALL 44 passages × exact kana + exact surface + 4 mutations + empty
const readCases = [];
const allReadPassages = E.RD.all;
for (const p of allReadPassages) {
  const exactKana = E.PLAINY(p.mk);
  const exactKanji = E.PLAINK(p.mk);

  // Variant A: drop 1 char inside first kanji reading
  const firstHanReading = p.han[0]?.[1] || '';
  const dropKanjiChar =
    firstHanReading.length >= 2
      ? exactKana.replace(firstHanReading, firstHanReading.slice(0, -1))
      : exactKana.slice(1);

  // Variant B: replace a voiced/unvoiced char or katakana char
  const swapChar = exactKana
    .replace(/パ/, 'バ')
    .replace(/カ/, 'ガ')
    .replace(/だ/, 'た')
    .replace(/す/, 'ず');

  // Variant C: insert extra char + drop a particle
  const noisy = exactKana.replace(/は /, 'わ ').replace(/を /, 'お ') + 'あ';

  const variants = [
    ['exact-kana', exactKana],
    ['exact-kanji', exactKanji],
    ['drop-kanji-char', dropKanjiChar],
    ['swap-char', swapChar],
    ['particle-and-extra', noisy],
    ['empty', ''],
  ];

  for (const [variant, input] of variants) {
    const res = E.gradeRead(p, input);
    readCases.push({
      id: p.id,
      variant,
      input,
      expected: {
        total: res.total,
        h: res.h,
        k: res.k,
        i: res.i,
        errs: res.errs,
        tally: res.tally,
        norm: res.norm,
        st: res.st,
      },
    });
  }
}

// 5. Seeded randomized fuzz cases (260 cases: romaji, kanji/Arabic numbers, noise, mutations)
const fuzzNormCases = [];
const fuzzPicCases = [];
const fuzzFreeCases = [];
const fuzzReadCases = [];

const romajiWords = [
  'watashi',
  'wa',
  'gakusei',
  'desu',
  'sensei',
  'terebi',
  'o',
  'mimasu',
  'gakkou',
  'e',
  'ikimasu',
  'sanji',
  'han',
  'roshia',
  'jin',
  'hatachi',
  'nanji',
  'kara',
  'made',
  'kudasai',
  'ko-hi-',
  'ke-ki',
  'mittsu',
  'futatsu',
  'sakka-',
  'toshokan',
  'yuubinkyoku',
  'arigatou',
  "kin'en",
  'zasshi',
];
const numFragments = [
  '1月',
  '4月',
  '9月',
  '1日',
  '4日',
  '10日',
  '14日',
  '20日',
  '24日',
  '20歳',
  '18才',
  '52才',
  '4時',
  '7時',
  '9時',
  '9:10',
  '12:30',
  '15分',
  '30分',
  '90分',
  '120分',
  '1階',
  '3階',
  '6階',
  '3,800円',
  '二万五千円',
  '三千八百円',
  '四百円',
  '3つ',
  '2つ',
  '10つ',
  '五人',
  '4人',
];
const noiseChars = [
  ' ',
  '　',
  '。',
  '、',
  '！',
  '？',
  'ー',
  'っ',
  'ん',
  'は',
  'わ',
  'を',
  'お',
  'へ',
  'え',
  'で',
  'に',
  'が',
  'と',
  'の',
];

function mutateString(base) {
  const arr = [...base];
  const opsCount = 1 + Math.floor(rng() * 3);
  for (let k = 0; k < opsCount; k++) {
    const op = Math.floor(rng() * 3);
    if (op === 0 && arr.length > 2) {
      arr.splice(Math.floor(rng() * arr.length), 1);
    } else if (op === 1) {
      arr.splice(Math.floor(rng() * (arr.length + 1)), 0, pick(noiseChars));
    } else if (arr.length > 0) {
      arr[Math.floor(rng() * arr.length)] = pick(noiseChars);
    }
  }
  return arr.join('');
}

for (let i = 0; i < 80; i++) {
  const parts = [];
  const len = 2 + Math.floor(rng() * 4);
  for (let j = 0; j < len; j++) {
    parts.push(rng() < 0.55 ? pick(romajiWords) : pick(numFragments));
  }
  const input = parts.join(rng() < 0.5 ? ' ' : '、');
  fuzzNormCases.push({
    input,
    norm: E.norm(input),
  });
}

for (let i = 0; i < 80; i++) {
  const q = pick(allPicQs);
  const srcPool = [
    q.a1,
    q.a2,
    ...q.j.accept,
    ...q.lad.filter((r) => r.a && !r.a.startsWith('(')).map((r) => r.a),
  ];
  const base = pick(srcPool);
  const input = rng() < 0.25 ? pick(romajiWords) + ' ' + pick(romajiWords) : mutateString(base);
  fuzzPicCases.push({
    id: q.id,
    input,
    expected: E.gradePic(q, input, false),
  });
}

for (let i = 0; i < 50; i++) {
  const q = pick(allFreeQs);
  const fill = freeFillByTopic[q.chu_de] || 'にほんご';
  const base = (rng() < 0.5 ? q.tra_loi_1 : q.tra_loi_2).replace(/○○/g, fill);
  const input = mutateString(base);
  fuzzFreeCases.push({
    id: q.id,
    input,
    expected: E.gradeFree(q, input),
  });
}

for (let i = 0; i < 50; i++) {
  const p = pick(allReadPassages);
  const base = rng() < 0.5 ? E.PLAINY(p.mk) : E.PLAINK(p.mk);
  const input = mutateString(base);
  const res = E.gradeRead(p, input);
  fuzzReadCases.push({
    id: p.id,
    input,
    expected: {
      total: res.total,
      h: res.h,
      k: res.k,
      i: res.i,
      errs: res.errs,
      tally: res.tally,
      norm: res.norm,
      st: res.st,
    },
  });
}

const baseline = {
  meta: {
    generatedFrom: 'legacy/app-logic.original.js',
    seed: 20261124,
    counts: {
      norm: normCases.length,
      pic: picCases.length,
      free: freeCases.length,
      read: readCases.length,
      fuzzNorm: fuzzNormCases.length,
      fuzzPic: fuzzPicCases.length,
      fuzzFree: fuzzFreeCases.length,
      fuzzRead: fuzzReadCases.length,
      total:
        normCases.length +
        picCases.length +
        freeCases.length +
        readCases.length +
        fuzzNormCases.length +
        fuzzPicCases.length +
        fuzzFreeCases.length +
        fuzzReadCases.length,
    },
  },
  normCases,
  picCases,
  freeCases,
  readCases,
  fuzzNormCases,
  fuzzPicCases,
  fuzzFreeCases,
  fuzzReadCases,
};

const outDir = path.join(rootDir, 'tests', 'golden');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'baseline.json'),
  JSON.stringify(baseline, null, 2) + '\n',
  'utf8',
);

console.log('Generated immutable golden baseline:', baseline.meta.counts);
