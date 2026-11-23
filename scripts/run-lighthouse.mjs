import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'test-results');
fs.mkdirSync(reportDir, { recursive: true });

// Supply-chain guard (M-08): never download remote packages via `npx --yes`.
// Require a pre-installed local or global `lighthouse` binary (or explicit LIGHTHOUSE_BIN).
function resolveLighthouseBinary() {
  if (process.env.LIGHTHOUSE_BIN && fs.existsSync(process.env.LIGHTHOUSE_BIN)) {
    return process.env.LIGHTHOUSE_BIN;
  }
  const localBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'lighthouse.cmd' : 'lighthouse',
  );
  if (fs.existsSync(localBin)) return localBin;

  const probe =
    process.platform === 'win32'
      ? spawnSync('where.exe', ['lighthouse'], { encoding: 'utf8' })
      : spawnSync('which', ['lighthouse'], { encoding: 'utf8' });
  if (probe.status === 0 && probe.stdout.trim()) {
    return probe.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

const lighthouseBin = resolveLighthouseBinary();
if (!lighthouseBin) {
  console.error(
    'Lighthouse binary not found locally. For supply-chain safety this script does not run `npx --yes`.\n' +
      'Install a pinned Lighthouse locally or globally first, e.g.:\n' +
      '  npm install -g lighthouse@13.6.0 --ignore-scripts\n' +
      'or set LIGHTHOUSE_BIN=/path/to/lighthouse.',
  );
  process.exit(1);
}

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
const chromeFlags =
  process.env.CI === 'true'
    ? '--headless=new --no-sandbox --disable-gpu'
    : '--headless=new --disable-gpu';

const lhArgs = [
  `http://127.0.0.1:${port}/`,
  '--output=json',
  `--output-path=${jsonOut}`,
  '--only-categories=performance,accessibility,best-practices,seo',
  '--form-factor=mobile',
  `--chrome-flags=${chromeFlags}`,
  '--quiet',
];

const child =
  process.platform === 'win32' && lighthouseBin.toLowerCase().endsWith('.cmd')
    ? spawn('cmd.exe', ['/d', '/s', '/c', lighthouseBin, ...lhArgs], {
        env: { ...process.env, CHROME_PATH: chromePath },
        stdio: 'inherit',
      })
    : spawn(lighthouseBin, lhArgs, {
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

if (
  scores.performance < 95 ||
  scores.accessibility < 100 ||
  scores.bestPractices < 100 ||
  scores.seo < 95
) {
  process.exit(1);
}
