import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const generatedDir = path.join(rootDir, 'src', 'data', 'generated');
const srcPicsDir = path.join(rootDir, 'assets', 'images', 'pictures');
const pubPicsDir = path.join(rootDir, 'public', 'images', 'pictures');
const iconsDir = path.join(rootDir, 'public', 'icons');

fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(pubPicsDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Partition immutable data/*.json into lazy-loadable per-lesson JSON modules
const cfg = JSON.parse(fs.readFileSync(path.join(dataDir, 'cfg.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'));
const rd = JSON.parse(fs.readFileSync(path.join(dataDir, 'rd.json'), 'utf8'));

function writeJsonIfChanged(filePath, obj) {
  const next = JSON.stringify(obj, null, 2) + '\n';
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === next) {
    return;
  }
  fs.writeFileSync(filePath, next, 'utf8');
}

writeJsonIfChanged(path.join(generatedDir, 'cfg.json'), cfg);
writeJsonIfChanged(path.join(generatedDir, 'scale.json'), data.scale);

const plainK = (s) =>
  String(s || '').replace(/\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g, (_m, a, _b, c) =>
    a != null ? a : c,
  );
const plainY = (s) =>
  String(s || '').replace(/\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g, (_m, _a, b, _c, d) =>
    b != null ? b : d,
  );

const catalog = {
  bais: cfg.bais,
  counts: {},
  items: [],
};

for (const bai of cfg.bais) {
  const key = String(bai);
  const pic = data.bai[key]?.pic ?? [];
  const free = data.bai[key]?.free ?? [];
  const read = rd[key] ?? [];

  writeJsonIfChanged(path.join(generatedDir, `bai-${bai}.json`), {
    bai,
    pic,
    free,
    read,
  });

  catalog.counts[key] = {
    pic: pic.length,
    free: free.length,
    read: read.length,
  };

  pic.forEach((q, idx) => {
    catalog.items.push({
      id: q.id,
      kind: 'pic',
      bai,
      index: idx + 1,
      title: q.type,
      jp: q.read,
      vn: q.vn,
      pic: q.pic,
      keywords: [q.id, q.type, q.read, q.vn, q.pat, q.a1, q.a2, q.wh].filter(Boolean).join(' '),
    });
  });

  free.forEach((q, idx) => {
    catalog.items.push({
      id: q.id,
      kind: 'free',
      bai,
      index: idx + 1,
      title: q.ten_chu_de,
      jp: q.cau_hoi_doc,
      vn: q.nghia_vn,
      topic: q.chu_de,
      keywords: [
        q.id,
        q.chu_de,
        q.ten_chu_de,
        q.cau_hoi_doc,
        q.nghia_vn,
        q.cau_truc,
        q.tu_vung,
        q.tra_loi_1,
        q.tra_loi_2,
      ]
        .filter(Boolean)
        .join(' '),
    });
  });

  read.forEach((p, idx) => {
    const snippet = plainK(p.mk)
      .replace(/[「」]/g, '')
      .slice(0, 22);
    catalog.items.push({
      id: p.id,
      kind: 'read',
      bai,
      index: idx + 1,
      title: `Đoạn ${idx + 1} · ${snippet}…`,
      jp: plainK(p.mk),
      vn: p.han.map(([k, y]) => `${k}(${y})`).join(' '),
      keywords: [p.id, plainK(p.mk), plainY(p.mk), ...p.han.flat()].join(' '),
    });
  });
}

writeJsonIfChanged(path.join(generatedDir, 'catalog.json'), catalog);

// 2. Optimize picture PNGs to AVIF + WebP + fallback PNG and record intrinsic dimensions
const imageMeta = {};
const pngFiles = fs.readdirSync(srcPicsDir).filter((f) => f.toLowerCase().endsWith('.png'));

function isFresh(outPath, srcMtimeMs) {
  return fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= srcMtimeMs;
}

await Promise.all(
  pngFiles.map(async (file) => {
    const key = path.basename(file, '.png');
    const srcPath = path.join(srcPicsDir, file);
    const srcMtime = fs.statSync(srcPath).mtimeMs;

    const meta = await sharp(srcPath).metadata();
    imageMeta[key] = {
      width: meta.width ?? 800,
      height: meta.height ?? 500,
    };

    const webpPath = path.join(pubPicsDir, `${key}.webp`);
    const avifPath = path.join(pubPicsDir, `${key}.avif`);
    const pngOutPath = path.join(pubPicsDir, `${key}.png`);

    if (!isFresh(webpPath, srcMtime)) {
      await sharp(srcPath).webp({ quality: 82, effort: 4 }).toFile(webpPath);
    }
    if (!isFresh(avifPath, srcMtime)) {
      await sharp(srcPath).avif({ quality: 62, effort: 4 }).toFile(avifPath);
    }
    if (!isFresh(pngOutPath, srcMtime)) {
      await sharp(srcPath).png({ compressionLevel: 9, palette: true }).toFile(pngOutPath);
    }
  }),
);

writeJsonIfChanged(path.join(generatedDir, 'image-meta.json'), imageMeta);

// 3. Generate PWA PNG icons from public/icons/icon.svg
const svgIconPath = path.join(iconsDir, 'icon.svg');
if (fs.existsSync(svgIconPath)) {
  const svgMtime = fs.statSync(svgIconPath).mtimeMs;
  const iconTargets = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, false],
  ];
  for (const [name, size, maskable] of iconTargets) {
    const outPath = path.join(iconsDir, name);
    if (!isFresh(outPath, svgMtime)) {
      if (maskable) {
        const inner = Math.round(size * 0.8);
        const pad = Math.round((size - inner) / 2);
        const resized = await sharp(svgIconPath).resize(inner, inner).png().toBuffer();
        await sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 246, g: 243, b: 236, alpha: 1 },
          },
        })
          .composite([{ input: resized, top: pad, left: pad }])
          .png({ compressionLevel: 9 })
          .toFile(outPath);
      } else {
        await sharp(svgIconPath).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
      }
    }
  }
}

console.log(
  `OK: Prepared ${cfg.bais.length} lesson chunks, ${pngFiles.length} pictures (AVIF/WebP/PNG), and PWA icons.`,
);

// 4. Generate trimmed woff2-only @font-face CSS for self-hosted Be Vietnam Pro, Noto Sans JP & Shippori Mincho (display)
const EDITORIAL_JP_CHARS =
  '日本語試験合格優良再戦採点票写真朗読第壱弐参問切手〒印必勝本番勝負話読答問答設定挑戦修行中開会話録音赤添削自習検課題百拾口頭';

const allDataText = [
  fs.readFileSync(path.join(dataDir, 'cfg.json'), 'utf8'),
  fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'),
  fs.readFileSync(path.join(dataDir, 'rd.json'), 'utf8'),
  EDITORIAL_JP_CHARS,
].join('');
const jpCodepoints = new Set();
for (const ch of allDataText) {
  const cp = ch.codePointAt(0);
  if (cp !== undefined && cp > 0x2e00) jpCodepoints.add(cp);
}
for (let c = 0x3000; c <= 0x30ff; c++) jpCodepoints.add(c);
for (let c = 0xff00; c <= 0xff60; c++) jpCodepoints.add(c);

const displayJpCodepoints = new Set();
for (const ch of EDITORIAL_JP_CHARS) {
  const cp = ch.codePointAt(0);
  if (cp !== undefined) displayJpCodepoints.add(cp);
}
for (let c = 0x3040; c <= 0x30ff; c++) displayJpCodepoints.add(c);

function extractFontFaces(pkgDir, cssRelPath, filterCodepoints) {
  const fullCss = fs.readFileSync(path.join(rootDir, 'node_modules', pkgDir, cssRelPath), 'utf8');
  const blocks = fullCss.split(/(?=@font-face)/).filter((b) => b.startsWith('@font-face'));
  const kept = [];
  for (const block of blocks) {
    const ur = block.match(/unicode-range:\s*([^;]+);/);
    const woff2 = block.match(/url\(\.\/(files\/[^)]+\.woff2)\)/);
    if (!woff2) continue;
    if (filterCodepoints && ur) {
      const ranges = ur[1].split(',').map((s) => s.trim().replace(/^U\+/i, ''));
      let hit = false;
      for (const r of ranges) {
        const parts = r.split('-').map((x) => parseInt(x, 16));
        const lo = parts[0];
        const hi = parts[1] ?? lo;
        for (const cp of filterCodepoints) {
          if (cp >= lo && cp <= hi) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (!hit) continue;
    }
    const clean = block
      .replace(
        /src:[^;]+;/,
        `src: url('../../../node_modules/${pkgDir}/${woff2[1]}') format('woff2');`,
      )
      .replace(/\s+$/, '');
    kept.push(clean);
  }
  return kept;
}

const fontBlocks = [];
for (const w of [400, 500, 600, 700]) {
  fontBlocks.push(
    ...extractFontFaces('@fontsource/be-vietnam-pro', `vietnamese-${w}.css`, null),
    ...extractFontFaces('@fontsource/be-vietnam-pro', `latin-${w}.css`, null),
  );
}
for (const w of [400, 500, 700]) {
  fontBlocks.push(...extractFontFaces('@fontsource/noto-sans-jp', `${w}.css`, jpCodepoints));
}
for (const w of [700, 800]) {
  fontBlocks.push(
    ...extractFontFaces('@fontsource/shippori-mincho', `latin-${w}.css`, null),
    ...extractFontFaces('@fontsource/shippori-mincho', `${w}.css`, displayJpCodepoints),
  );
}

const fontsCssPath = path.join(generatedDir, 'fonts.css');
const fontsCss = `/* Auto-generated self-hosted subset fonts (woff2 only, font-display: swap) */\n${fontBlocks.join('\n\n')}\n`;
if (!fs.existsSync(fontsCssPath) || fs.readFileSync(fontsCssPath, 'utf8') !== fontsCss) {
  fs.writeFileSync(fontsCssPath, fontsCss, 'utf8');
}
console.log(`OK: Generated self-hosted fonts.css (${fontBlocks.length} @font-face rules).`);
