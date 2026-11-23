import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tokensPath = path.join(rootDir, 'src', 'ui', 'tokens.css');

if (!fs.existsSync(tokensPath)) {
  console.error('FAIL: Missing src/ui/tokens.css');
  process.exit(1);
}

const css = fs.readFileSync(tokensPath, 'utf8');

function extractVars(block) {
  const vars = {};
  const rx = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g;
  let m;
  while ((m = rx.exec(block))) {
    vars[m[1]] = m[2].toUpperCase();
  }
  return vars;
}

const lightMatch = css.match(/:root\s*\{([^}]+)\}/);
const darkMatch = css.match(/:root\[data-theme='dark'\]\s*\{([^}]+)\}/);

if (!lightMatch || !darkMatch) {
  console.error("FAIL: Could not find :root and :root[data-theme='dark'] blocks in tokens.css");
  process.exit(1);
}

const themes = {
  light: extractVars(lightMatch[1]),
  dark: extractVars(darkMatch[1]),
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ['ink', 'bg', 4.5, 'Primary text on page bg'],
  ['ink', 'surface', 4.5, 'Primary text on surface'],
  ['ink', 'surface-2', 4.5, 'Primary text on surface-2'],
  ['ink-2', 'bg', 4.5, 'Secondary text on page bg'],
  ['ink-2', 'surface', 4.5, 'Secondary text on surface'],
  ['ink-2', 'surface-2', 4.5, 'Secondary text on surface-2'],
  ['accent', 'bg', 4.5, 'Accent text on page bg'],
  ['accent', 'surface', 4.5, 'Accent text on surface'],
  ['accent-ink', 'accent', 4.5, 'Text on primary accent button'],
  ['hanko', 'bg', 4.5, 'Hanko red text on bg'],
  ['hanko', 'surface', 4.5, 'Hanko red text on surface'],
  ['hanko-ink', 'hanko', 4.5, 'Text on hanko badge/mic'],
  ['good', 'good-soft', 4.5, 'Good text on good-soft'],
  ['good', 'surface', 4.5, 'Good text on surface'],
  ['warn', 'warn-soft', 4.5, 'Warn text on warn-soft'],
  ['warn', 'surface', 4.5, 'Warn text on surface'],
  ['bad', 'bad-soft', 4.5, 'Bad text on bad-soft'],
  ['bad', 'surface', 4.5, 'Bad text on surface'],
  ['mark-ink', 'mark', 4.5, 'Mark ink on mark highlight'],
  ['kata', 'surface', 4.5, 'Katakana accent on surface'],
  ['accent', 'accent-soft', 4.5, 'Accent text on accent-soft'],
  ['line-strong', 'bg', 3.0, 'Interactive control border on bg'],
  ['line-strong', 'surface', 3.0, 'Interactive control border on surface'],
];

const failures = [];
for (const [themeName, vars] of Object.entries(themes)) {
  for (const [fg, bg, minRatio, label] of pairs) {
    if (!vars[fg] || !vars[bg]) {
      failures.push(`[${themeName}] Missing token --${fg} or --${bg} for "${label}"`);
      continue;
    }
    const ratio = contrast(vars[fg], vars[bg]);
    if (ratio < minRatio) {
      failures.push(
        `[${themeName}] ${label} (--${fg} ${vars[fg]} on --${bg} ${vars[bg]}): ${ratio.toFixed(2)}:1 < ${minRatio}:1`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('WCAG 2.2 AA Contrast check FAILED:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`OK: All ${pairs.length * 2} WCAG 2.2 AA light/dark contrast checks passed.`);
