import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'test-results');
fs.mkdirSync(reportDir, { recursive: true });

const port = 4178;
const server = spawn(
  process.execPath,
  [path.join(__dirname, 'preview-server.mjs'), '--port', String(port)],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  },
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

const chromePath = chromium.executablePath();
const jsonOut = path.join(reportDir, 'lighthouse-mobile.json');

const lhArgs = [
  '--yes',
  'lighthouse@13.6.0',
  `http://127.0.0.1:${port}/`,
  '--output=json',
  `--output-path=${jsonOut}`,
  '--only-categories=performance,accessibility,best-practices,seo',
  '--form-factor=mobile',
  '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
  '--quiet',
];

const child =
  process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', 'npx', ...lhArgs], {
        env: { ...process.env, CHROME_PATH: chromePath },
        stdio: 'inherit',
      })
    : spawn('npx', lhArgs, {
        env: { ...process.env, CHROME_PATH: chromePath },
        stdio: 'inherit',
      });

const exitCode = await new Promise((resolve) => child.on('close', resolve));
server.kill();

if (exitCode !== 0 || !fs.existsSync(jsonOut)) {
  console.error('Lighthouse failed with exit code:', exitCode);
  process.exit(exitCode || 1);
}

const report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
const cats = report.categories;
const scores = {
  performance: Math.round((cats.performance?.score ?? 0) * 100),
  accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
  bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
  seo: Math.round((cats.seo?.score ?? 0) * 100),
};
const lcpMs = Math.round(report.audits['largest-contentful-paint']?.numericValue ?? 0);
const cls = report.audits['cumulative-layout-shift']?.numericValue ?? 0;

console.log('=== LIGHTHOUSE MOBILE SCORES ===');
console.log(JSON.stringify({ ...scores, lcpMs, cls }, null, 2));

for (const [catKey, cat] of Object.entries(cats)) {
  const failing = cat.auditRefs
    .map((ref) => report.audits[ref.id])
    .filter(
      (a) =>
        a &&
        a.score !== null &&
        a.score < 1 &&
        a.scoreDisplayMode !== 'informative' &&
        a.scoreDisplayMode !== 'notApplicable',
    );
  if (failing.length > 0) {
    console.log(`\nNon-100 audits in ${catKey}:`);
    for (const a of failing.slice(0, 10)) {
      console.log(`  - [${a.id}] score=${a.score} :: ${a.title} (${a.displayValue || ''})`);
    }
  }
}

if (
  scores.performance < 95 ||
  scores.accessibility < 100 ||
  scores.bestPractices < 100 ||
  scores.seo < 95
) {
  process.exit(1);
}
