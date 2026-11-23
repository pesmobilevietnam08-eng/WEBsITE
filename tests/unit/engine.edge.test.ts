import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CfgSchema,
  RawDataFileSchema,
  type RawFreeQuestion,
  type RawPicQuestion,
} from '../../src/data/schema';
import {
  loadAllLessons,
  loadCatalog,
  loadCfg,
  loadImageMeta,
  loadLesson,
  loadScale,
} from '../../src/data/loaders';
import { getPictureAlt } from '../../src/data/pictureAlt';
import {
  ageK,
  createNormalizer,
  dayK,
  digitToKanji,
  getScaleItem,
  gradeFree,
  gradePic,
  gradeRead,
  hourK,
  kaiK,
  minK,
  monthK,
  ninK,
  numK,
  penOf,
  prepareReadingPassage,
  repOK,
  romaToKana,
  tsuK,
  ynTruth,
} from '../../src/engine';

const rootDir = path.resolve(__dirname, '..', '..');
const cfg = CfgSchema.parse(
  JSON.parse(fs.readFileSync(path.join(rootDir, 'data/cfg.json'), 'utf8')),
);
const rawData = RawDataFileSchema.parse(
  JSON.parse(fs.readFileSync(path.join(rootDir, 'data/data.json'), 'utf8')),
);
const allPicQuestions = cfg.bais.flatMap((b) => rawData.bai[String(b)]?.pic ?? []);

describe('Engine edge coverage & data loaders', () => {
  it('covers number conversion boundaries and special Japanese readings', () => {
    expect(monthK(0)).toBeNull();
    expect(monthK(4)).toBe('しがつ');
    expect(monthK(12)).toBe('じゅうにがつ');
    expect(dayK(0)).toBeNull();
    expect(dayK(32)).toBeNull();
    expect(dayK(1)).toBe('ついたち');
    expect(dayK(24)).toBe('にじゅうよっか');
    expect(dayK(25)).toBe('にじゅうごにち');
    expect(ageK(0)).toBeNull();
    expect(ageK(100)).toBeNull();
    expect(ageK(20)).toBe('はたち');
    expect(ageK(10)).toBe('じゅっさい');
    expect(ageK(30)).toBe('さんじゅっさい');
    expect(ageK(8)).toBe('はっさい');
    expect(hourK(0)).toBeNull();
    expect(hourK(4)).toBe('よじ');
    expect(hourK(9)).toBe('くじ');
    expect(minK(-1)).toBeNull();
    expect(minK(100)).toBeNull();
    expect(minK(0)).toBe('');
    expect(minK(10)).toBe('じゅっぷん');
    expect(minK(30)).toBe('さんじゅっぷん');
    expect(minK(1)).toBe('いっぷん');
    expect(kaiK(0)).toBeNull();
    expect(kaiK(3)).toBe('さんがい');
    expect(numK(0)).toBe('');
    expect(numK(100_000_000)).toBe('');
    expect(numK(10000)).toBe('いちまん');
    expect(numK(23685)).toBe('にまんさんぜんろっぴゃくはちじゅうご');
    expect(numK(18300)).toBe('いちまんはっせんさんびゃく');
    expect(numK(800)).toBe('はっぴゃく');
    expect(tsuK(0)).toBeNull();
    expect(tsuK(10)).toBe('とお');
    expect(digitToKanji(5)).toBe('五');
    expect(digitToKanji(14)).toBe('十四');
    expect(digitToKanji(32)).toBe('三十二');
    expect(ninK(1)).toBe('ひとり');
    expect(ninK(12)).toBe('じゅうににん');
    expect(ninK(0)).toBeNull();
  });

  it('covers romaToKana edge cases (tch, invalid letters) and scale fallbacks', () => {
    expect(romaToKana('matcha')).toBe('まっちゃ');
    expect(romaToKana('xyz')).toBeNull();
    expect(getScaleItem(rawData.scale, 'R0')?.pen).toBe('−15');
    expect(getScaleItem(rawData.scale, 'R9')?.pen).toBe('−10');
    expect(getScaleItem(rawData.scale, 'UNKNOWN')).toBeUndefined();
    expect(penOf(rawData.scale, 'UNKNOWN')).toBe(3);
  });

  it('covers repOK, ynTruth, genericFree, L26, and extended gradePic/gradeRead branches', () => {
    const { norm } = createNormalizer({ kx: [['試験', 'しけん']], vs: cfg.vs });
    expect(norm('試験です')).toBe('しけんです');
    expect(repOK('たべます', 're:たべ', norm)).toBe(true);
    expect(repOK('たべます', 're:[invalid', norm)).toBe(false);
    expect(repOK('いきます', 'いきます', norm)).toBe(true);
    expect(ynTruth('はい')).toBe('yes');
    expect(ynTruth('いいえ')).toBe('no');
    expect(ynTruth('other')).toBeNull();

    const l26Q: RawFreeQuestion = {
      id: 'TEST-L26',
      chu_de: 'L26',
      ten_chu_de: 'Mời rủ',
      dang_hoi: 'WH',
      cau_hoi_doc: 'いっしょにえいがをみませんか',
      nghia_vn: 'Cùng xem phim nhé?',
      cau_truc: 'いいですね、みましょう',
      tu_vung: 'えいが: phim',
      tra_loi_1: 'いいですね、みましょう。',
      nghia_1: 'Hay quá, cùng xem nào.',
      tra_loi_2: 'すみません、ちょっとようじがありますから。',
      nghia_2: 'Xin lỗi, tôi có việc bận.',
      tu_soat_thong_tin: 'Nhận lời hoặc từ chối',
      tu_soat_nhac: 'Thử nói いいですね',
    };
    expect(gradeFree(l26Q, 'いいですね、みましょう', cfg).every((x) => x.ok)).toBe(true);

    const genericQ: RawFreeQuestion = {
      ...l26Q,
      id: 'TEST-L99',
      chu_de: 'L99',
      cau_hoi_doc: 'かぞくはなんにんですか',
      tra_loi_1: 'よにんです。',
      tra_loi_2: 'さんにんです。',
    };
    expect(gradeFree(genericQ, 'よにんです', cfg)[0]?.ok).toBe(true);
    expect(gradeFree(genericQ, 'わかりません', cfg)[0]?.ok).toBe(false);

    // Extended gradePic branches (R9b, R5e, R5f, non-JPD113 TENSE, partial read mode)
    const basePic = allPicQuestions[0]!;
    const extPic: RawPicQuestion = {
      ...basePic,
      read: 'きのうテレビをみましたか',
      a1: 'テレビをみました',
      a2: 'みました',
      j: {
        kind: 'WH',
        truth: null,
        accept: ['テレビをみました'],
        need: [['てれび'], ['みました']],
        typ: 'ACT-WH',
        rep: ['みました'],
      },
      lad: [
        ...basePic.lad,
        { a: 'はい', s: 9, c: 'R9b', why: 'Trả lời quá ngắn', hint: 'Nói đầy đủ hơn' },
        { a: 'てれびをみます', s: 12, c: 'R5e', why: 'Sai thì', hint: 'Dùng quá khứ' },
      ],
    };
    const extCfg = { ...cfg, code: 'JPD123', partial: true };
    const extCtx = { cfg: extCfg, scale: rawData.scale, allPicQuestions };
    expect(gradePic(extPic, 'はい、そうです', extCtx).items[0]?.c).toBe('R9b');
    expect(gradePic(extPic, 'テレビをみます', extCtx, true).items.some((x) => x.c === 'R5e')).toBe(
      true,
    );

    const f133Passage = prepareReadingPassage(
      {
        id: 'T-133',
        title: 'かぞく',
        mk: 'わたしは [漢字|かんじ]と {学生|がくせい}と コーヒーです。',
        han: [['学生', 'がくせい']],
        nw: [['学生', 'がくせい', 'học sinh']],
      },
      '133',
    );
    const readRes = gradeRead(
      f133Passage,
      'かぞく わたしは かんじと がくせと こーひーです',
      extCfg,
    );
    expect(readRes.total).toBeGreaterThan(0);
    expect(readRes.diff.length).toBeGreaterThan(0);
  });

  it('loads all lazy data chunks, catalog, image metadata, and Vietnamese alt descriptions', async () => {
    const loadedCfg = await loadCfg();
    expect(loadedCfg.code).toBe('JPD113');
    const scale = await loadScale();
    expect(scale.R0).toBeDefined();
    const catalog = await loadCatalog();
    expect(catalog.items.length).toBe(31 + 32 + 44);
    const imgMeta = await loadImageMeta();
    expect(Object.keys(imgMeta).length).toBe(28);
    const lessons = await loadAllLessons();
    expect(lessons).toHaveLength(3);
    expect(await loadLesson(1)).toBe(lessons[0]);
    await expect(loadLesson(99)).rejects.toThrow();
    expect(getPictureAlt('B1-T01')).not.toContain('TODO-review');
    expect(getPictureAlt('UNKNOWN')).toBe('Tranh tình huống của câu hỏi vấn đáp');
  });
});
