import type { CfgData } from '../../data/schema';
import { ageK, dayK, hourK, kaiK, kanjiNum, minK, monthK, numK, tsuK } from './numbers';
import { kataToHira, lenFix, romajiText } from './romaji';

export const MAX_QA_INPUT_LENGTH = 500;
export const MAX_READ_INPUT_LENGTH = 2000;

const BASE_KANJI: readonly (readonly [string, string])[] = [
  ['日本語学校', 'にほんごがっこう'],
  ['日本語', 'にほんご'],
  ['大学生', 'だいがくせい'],
  ['会社員', 'かいしゃいん'],
  ['桜大学', 'さくらだいがく'],
  ['大学', 'だいがく'],
  ['学生', 'がくせい'],
  ['先生', 'せんせい'],
  ['教師', 'きょうし'],
  ['社員', 'しゃいん'],
  ['医者', 'いしゃ'],
  ['銀行員', 'ぎんこういん'],
  ['花火', 'はなび'],
  ['旅行', 'りょこう'],
  ['映画', 'えいが'],
  ['読書', 'どくしょ'],
  ['音楽', 'おんがく'],
  ['料理', 'りょうり'],
  ['写真', 'しゃしん'],
  ['買い物', 'かいもの'],
  ['水泳', 'すいえい'],
  ['趣味', 'しゅみ'],
  ['誕生日', 'たんじょうび'],
  ['名前', 'なまえ'],
  ['仕事', 'しごと'],
  ['私', 'わたし'],
  ['中国', 'ちゅうごく'],
  ['韓国', 'かんこく'],
  ['日本', 'にほん'],
  ['人', 'じん'],
  ['二十歳', 'はたち'],
  ['火曜日', 'かようび'],
  ['月曜日', 'げつようび'],
  ['水曜日', 'すいようび'],
  ['木曜日', 'もくようび'],
  ['金曜日', 'きんようび'],
  ['土曜日', 'どようび'],
  ['日曜日', 'にちようび'],
  ['友達', 'ともだち'],
  ['学校', 'がっこう'],
  ['今', 'いま'],
  ['午前', 'ごぜん'],
  ['午後', 'ごご'],
  ['時計', 'とけい'],
  ['英語', 'えいご'],
  ['野菜', 'やさい'],
  ['財布', 'さいふ'],
  ['公園', 'こうえん'],
  ['携帯電話', 'けいたいでんわ'],
  ['電話', 'でんわ'],
  ['辞書', 'じしょ'],
  ['図書館', 'としょかん'],
  ['郵便局', 'ゆうびんきょく'],
  ['銀行', 'ぎんこう'],
  ['病院', 'びょういん'],
  ['体育館', 'たいいくかん'],
  ['会社', 'かいしゃ'],
  ['毎日', 'まいにち'],
  ['毎朝', 'まいあさ'],
  ['毎晩', 'まいばん'],
  ['夏休み', 'なつやすみ'],
  ['冬休み', 'ふゆやすみ'],
  ['休みの日', 'やすみのひ'],
  ['休み', 'やすみ'],
  ['勉強', 'べんきょう'],
  ['食べ', 'たべ'],
  ['飲み', 'のみ'],
  ['見ま', 'みま'],
  ['行き', 'いき'],
  ['読み', 'よみ'],
  ['帰り', 'かえり'],
  ['寝ま', 'ねま'],
  ['起き', 'おき'],
  ['働き', 'はたらき'],
  ['買い', 'かい'],
  ['聞き', 'きき'],
  ['書き', 'かき'],
  ['ご飯', 'ごはん'],
  ['御飯', 'ごはん'],
  ['卵', 'たまご'],
  ['魚', 'さかな'],
  ['牛肉', 'ぎゅうにく'],
  ['豚肉', 'ぶたにく'],
  ['お茶', 'おちゃ'],
  ['水', 'みず'],
  ['家', 'うち'],
  ['朝', 'あさ'],
  ['夜', 'よる'],
  ['本', 'ほん'],
  ['何', 'なに'],
  ['円', 'えん'],
  ['階', 'かい'],
  ['歳', 'さい'],
  ['才', 'さい'],
  ['時', 'じ'],
  ['分', 'ふん'],
  ['半', 'はん'],
];

const SKIP_UNIT_KANJI = new Set(['時', '分', '円', '階', '歳', '才', '半']);
const KANJI_CHAR_RX = /[一-龯々]/;
const HIRAGANA_CHAR_RX = /[ぁ-ん]/;

function replaceVerbStems(input: string, vs: Readonly<Record<string, string>>): string {
  if (Object.keys(vs).length === 0) return input;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] ?? '';
    const repl = Object.prototype.hasOwnProperty.call(vs, ch) ? vs[ch] : undefined;
    if (repl !== undefined) {
      const prev = i > 0 ? (input[i - 1] ?? '') : '';
      const next = i + 1 < input.length ? (input[i + 1] ?? '') : '';
      if (!KANJI_CHAR_RX.test(prev) && HIRAGANA_CHAR_RX.test(next)) {
        out += repl;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

export interface Normalizer {
  readonly kanjiTable: readonly (readonly [string, string])[];
  readonly norm: (input: string, maxLen?: number) => string;
}

export function createNormalizer(cfg: Pick<CfgData, 'kx' | 'vs'>): Normalizer {
  const kanjiTable: [string, string][] = BASE_KANJI.map(([k, v]) => [k, v]);
  if (cfg.kx.length > 0) {
    const have = new Set(kanjiTable.map((x) => x[0]));
    for (const pair of cfg.kx) {
      if (!have.has(pair[0])) {
        kanjiTable.push([pair[0], pair[1]]);
        have.add(pair[0]);
      }
    }
  }
  kanjiTable.sort((a, b) => b[0].length - a[0].length);

  const filteredKanji = kanjiTable.filter(([k]) => !SKIP_UNIT_KANJI.has(k));
  const vs = cfg.vs;

  const norm = (raw: string, maxLen = MAX_QA_INPUT_LENGTH): string => {
    let s = String(raw || '');
    if (s.length > maxLen) {
      s = s.slice(0, maxLen);
    }
    s = s.normalize('NFKC');
    if (s.length > maxLen) {
      s = s.slice(0, maxLen);
    }
    s = romajiText(s);
    s = s.replace(/時間半/g, '時かんはん').replace(/時間/g, '時かん');
    for (const [k, v] of filteredKanji) {
      s = s.split(k).join(v);
    }
    s = replaceVerbStems(s, vs);
    s = kanjiNum(s);
    s = s
      .replace(/(\d+)\s*千/g, (_m, n: string) => String(+n * 1000))
      .replace(/(\d+)\s*百/g, (_m, n: string) => String(+n * 100));
    s = s.replace(/(\d{1,2})[:：](\d{2})/g, (m, h: string, mi: string) => {
      const hk = hourK(+h);
      const mk = +mi ? minK(+mi) : '';
      return (hk || m) + (mk ?? '');
    });
    s = s.replace(/(\d+)\s*分(?!間)/g, (m, nStr: string) => {
      const n = +nStr;
      if (n < 60) return m;
      const h = Math.floor(n / 60);
      const r = n % 60;
      return `${hourK(h) || `${h}じ`}かん${r === 30 ? 'はん' : r ? `${r}分` : ''}`;
    });
    s = s
      .replace(/(\d{1,2})\s*(?:時|じ)\s*半/g, (m, h: string) => `${hourK(+h) || m}はん`)
      .replace(/(\d{1,2})\s*(?:時|じ)/g, (m, h: string) => hourK(+h) || m)
      .replace(/(\d{1,2})\s*(?:分|ふん|ぷん)/g, (m, n: string) => minK(+n) || m);
    s = s
      .replace(/(\d+)\s*(?:歳|才|さい)/g, (m, n: string) => ageK(+n) || m)
      .replace(/(\d+)\s*(?:月|がつ)/g, (m, n: string) => monthK(+n) || m)
      .replace(/(\d+)\s*(?:日|にち)/g, (m, n: string) => dayK(+n) || m);
    s = s.replace(/(\d+)\s*(?:階|かい|がい)/g, (m, n: string) => kaiK(+n) || m);
    s = s.replace(/(\d+)\s*つ/g, (m, n: string) => tsuK(+n) || m);
    s = s
      .replace(/[\d,]+(?=\s*(?:円|えん|ドル|ドン|どる|どん))/g, (tok) => {
        const parts = tok.split(',');
        const isCommaGrouped =
          parts.length > 1 &&
          parts[0] !== undefined &&
          parts[0].length >= 1 &&
          parts[0].length <= 3 &&
          parts.slice(1).every((p) => p.length === 3);
        if (isCommaGrouped) {
          return numK(+tok.replace(/,/g, '')) || tok;
        }
        const tailDigits = parts[parts.length - 1] ?? '';
        if (!tailDigits) return tok;
        const prefix = tok.slice(0, tok.length - tailDigits.length);
        return prefix + (numK(+tailDigits) || tailDigits);
      })
      .replace(/円/g, 'えん');
    s = s.replace(/(\d+)\s*万/g, (_m, n: string) => `${numK(+n)}まん`);
    s = s.replace(/じかんさんじゅっぷん/g, 'じかんはん');
    s = s.toLowerCase().replace(/[\s、。，．,.!！?？「」『』（）()〜~・…]/g, '');
    const out = lenFix(kataToHira(s));
    return out.length > maxLen ? out.slice(0, maxLen) : out;
  };

  return { kanjiTable, norm };
}
