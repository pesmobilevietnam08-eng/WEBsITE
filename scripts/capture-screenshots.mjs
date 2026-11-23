/* global window, document */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const port = 4176;
const baseUrl = `http://127.0.0.1:${port}`;

function buildSeedState(theme) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const nowIso = now.toISOString();
  const dueIso = new Date(now.getTime() - 3_600_000).toISOString();

  return {
    schema: 3,
    name: 'Minh Anh',
    settings: {
      theme,
      voiceURI: null,
      furigana: true,
      jpFontSize: 'md',
      typingOnly: false,
      pcBannerDismissed: true,
      speechPrivacyAccepted: true,
      showPromo: false,
      lastBai: 1,
    },
    attempts: {
      'B1-T01-1': {
        best: 80,
        bestScore15: 12,
        last: 'ロシアじんです',
        count: 2,
        lastAt: nowIso,
        nextReviewAt: dueIso,
        lastCodes: ['R11'],
        history: [{ at: nowIso, score: 80, score15: 12, codes: ['R11'], input: 'ロシアじんです' }],
      },
      'B1-T02-1': {
        best: 100,
        bestScore15: 15,
        last: 'はい、そうです',
        count: 1,
        lastAt: nowIso,
        nextReviewAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
        lastCodes: [],
        history: [{ at: nowIso, score: 100, score15: 15, codes: [], input: 'はい、そうです' }],
      },
      'KT113-B1-01': {
        best: 100,
        last: 'ミンです',
        count: 1,
        lastAt: nowIso,
        history: [{ at: nowIso, score: 100, input: 'ミンです' }],
      },
    },
    readAttempts: {
      'L1.1': {
        best: 90,
        last: 'かぞくの しごとです。ちちは ごじゅうさいの パイロットです。',
        count: 2,
        lastAt: nowIso,
        nextReviewAt: dueIso,
        lastBreakdown: { h: 67, k: 100, i: 100 },
        history: [{ at: nowIso, score: 90, input: 'かぞくの しごとです。' }],
      },
      'L1.2': {
        best: 100,
        last: 'わたしは ベトナムじんです。',
        count: 1,
        lastAt: nowIso,
        lastBreakdown: { h: 100, k: 100, i: 100 },
        history: [{ at: nowIso, score: 100, input: 'わたしは ベトナムじんです。' }],
      },
    },
    examHistory: [
      {
        id: 'exam-seed-1',
        at: nowIso,
        durationSec: 215,
        readScore: 90,
        picAvgPct: 87,
        freePassCount: 2,
        freeTotal: 2,
        overallPct: 91,
        itemIds: ['L1.1', 'B1-T01-1', 'B1-T02-1', 'B2-T01-1', 'KT113-B1-01', 'KT113-B2-01'],
      },
    ],
    activityDays: [twoDaysAgo, yesterday, today],
    createdAt: twoDaysAgo + 'T08:00:00.000Z',
    updatedAt: nowIso,
  };
}

const server = spawn(
  process.execPath,
  [path.join(__dirname, 'preview-server.mjs'), '--port', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Preview server timeout')), 10_000);
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('running')) {
      clearTimeout(timeout);
      resolve();
    }
  });
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
});

const browser = await chromium.launch();
const overflowFailures = [];
let capturedCount = 0;

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (metrics.scrollWidth > metrics.innerWidth + 1) {
    overflowFailures.push(
      `${label}: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
    );
  }
}

async function capture(page, fileName) {
  await page.waitForTimeout(250);
  await assertNoOverflow(page, fileName);
  await page.screenshot({ path: path.join(outDir, fileName), fullPage: true });
  capturedCount += 1;
}

try {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  const themes = ['light', 'dark'];

  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });
      const seed = buildSeedState(theme);
      await context.addInitScript((state) => {
        window.localStorage.setItem('jpd113.v3', JSON.stringify(state));
      }, seed);

      const page = await context.newPage();

      // 1. Dashboard
      await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
      await capture(page, `01-dashboard-${vp.name}-${theme}.png`);

      // 2. Read list
      await page.goto(`${baseUrl}/#/read`, { waitUntil: 'networkidle' });
      await page
        .getByRole('heading', { level: 1, name: 'Luyện đọc đoạn văn' })
        .waitFor({ state: 'visible' });
      await capture(page, `02-read-list-${vp.name}-${theme}.png`);

      // 3. Read practice (L1.1)
      await page.goto(`${baseUrl}/#/read/L1.1?bai=1`, { waitUntil: 'networkidle' });
      await page.locator('ruby').first().waitFor({ state: 'visible' });
      await capture(page, `03-read-practice-${vp.name}-${theme}.png`);

      // 4. Read result (90% with DiffText)
      const textWithError =
        'かぞくの しごとです。ちちは ごじゅうさいの パイロットです。ははは しゃいんでは ありません。にほんごの きょうしです。あには カメラマンです。あねは ナースです。わたしは がくせいです。';
      await page.getByLabel('Em đọc').fill(textWithError);
      await page.getByRole('button', { name: 'Chấm bài đọc' }).click();
      await page.getByText('Chữ Hán (đúng 2/3 từ)').waitFor({ state: 'visible' });
      await capture(page, `04-read-result-${vp.name}-${theme}.png`);

      // 5. QA list (pic tab)
      await page.goto(`${baseUrl}/#/qa?bai=1&tab=pic`, { waitUntil: 'networkidle' });
      await page
        .getByRole('heading', { level: 1, name: 'Luyện vấn đáp' })
        .waitFor({ state: 'visible' });
      await capture(page, `05-qa-list-${vp.name}-${theme}.png`);

      // 6. QA practice (B1-T01-1 with peek revealed)
      await page.goto(`${baseUrl}/#/qa/B1-T01-1?bai=1&tab=pic`, { waitUntil: 'networkidle' });
      await page.locator('picture img').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: /Hiện chữ câu hỏi/ }).click();
      await page.getByText('ソフィアさんのおくにはどちらですか').waitFor({ state: 'visible' });
      await capture(page, `06-qa-practice-${vp.name}-${theme}.png`);

      // 7. QA result pic (80% R11)
      await page.getByLabel('Câu trả lời của em').fill('roshia jin desu');
      await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
      await page.getByText('R11', { exact: true }).first().waitFor({ state: 'visible' });
      await capture(page, `07-qa-result-pic-${vp.name}-${theme}.png`);

      // 8. QA result free (KT113-B1-01)
      await page.goto(`${baseUrl}/#/qa/KT113-B1-01?bai=1&tab=free`, { waitUntil: 'networkidle' });
      await page.getByLabel('Câu trả lời của em').fill('Min desu');
      await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
      await page.getByText(/Phản hồi tham khảo/).waitFor({ state: 'visible' });
      await capture(page, `08-qa-result-free-${vp.name}-${theme}.png`);

      // 9. Mock Exam intro
      await page.goto(`${baseUrl}/#/exam`, { waitUntil: 'networkidle' });
      await page
        .getByRole('heading', { level: 1, name: 'Thi thử có giới hạn thời gian' })
        .waitFor({ state: 'visible' });
      await capture(page, `09-exam-${vp.name}-${theme}.png`);

      // 10. Settings
      await page.goto(`${baseUrl}/#/settings`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1, name: 'Cài đặt' }).waitFor({ state: 'visible' });
      await capture(page, `10-settings-${vp.name}-${theme}.png`);

      await context.close();
    }
  }

  // Extra 360px narrow-mobile overflow verification across main routes
  const narrowCtx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await narrowCtx.addInitScript((state) => {
    window.localStorage.setItem('jpd113.v3', JSON.stringify(state));
  }, buildSeedState('light'));
  const narrowPage = await narrowCtx.newPage();
  for (const route of [
    '/#/',
    '/#/read',
    '/#/read/L1.1?bai=1',
    '/#/qa?bai=1&tab=pic',
    '/#/qa/B1-T01-1?bai=1&tab=pic',
    '/#/exam',
    '/#/settings',
  ]) {
    await narrowPage.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await narrowPage.waitForTimeout(200);
    await assertNoOverflow(narrowPage, `360px ${route}`);
  }
  await narrowCtx.close();
} finally {
  await browser.close();
  server.kill();
}

if (overflowFailures.length > 0) {
  console.error('HORIZONTAL OVERFLOW DETECTED:');
  for (const f of overflowFailures) console.error(' -', f);
  process.exit(1);
}

console.log(
  `OK: Captured ${capturedCount} screenshots in docs/screenshots/ and verified 0 horizontal overflow (360px, 390px, 1440px, light/dark).`,
);
