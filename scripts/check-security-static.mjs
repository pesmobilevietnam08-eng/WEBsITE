import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const errors = [];

// 1. Static source code scan
const srcRules = [
  { name: 'innerHTML', rx: /\.innerHTML\b/ },
  { name: 'outerHTML', rx: /\.outerHTML\b/ },
  { name: 'insertAdjacentHTML', rx: /\.insertAdjacentHTML\b/ },
  { name: 'dangerouslySetInnerHTML', rx: /\bdangerouslySetInnerHTML\b/ },
  { name: 'document.write', rx: /\bdocument\.write(ln)?\s*\(/ },
  { name: 'eval()', rx: /\beval\s*\(/ },
  { name: 'new Function', rx: /\bnew\s+Function\s*\(/ },
  { name: 'Google Fonts CDN', rx: /fonts\.googleapis\.com|fonts\.gstatic\.com/ },
  { name: 'Inline HTML event handler', rx: /\son(click|load|error|mouseover)\s*=\s*["']/ },
];

for (const file of walk(srcDir, ['.ts', '.tsx', '.css'])) {
  const rel = path.relative(rootDir, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of srcRules) {
    if (rule.rx.test(text)) {
      errors.push(`Forbidden pattern (${rule.name}) in ${rel}`);
    }
  }
  // Check target="_blank" has rel="noopener noreferrer"
  const blankMatches = text.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/g);
  for (const m of blankMatches) {
    const tag = m[0];
    if (!/rel\s*=\s*["'][^"']*noopener[^"']*noreferrer[^"']*["']/.test(tag)) {
      errors.push(`Anchor with target="_blank" missing rel="noopener noreferrer" in ${rel}`);
    }
  }
}

// 2. Check index.html has no inline script/style or CDN links
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(indexHtml)) {
  errors.push('External Google Fonts link found in index.html');
}
if (/<style\b/i.test(indexHtml)) {
  errors.push('Inline <style> tag found in index.html');
}
if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(indexHtml)) {
  errors.push('Inline <script> tag found in index.html');
}

// 3. Built bundle scan (if dist/ exists)
if (fs.existsSync(distDir)) {
  const builtIndexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(builtIndexPath)) {
    const builtHtml = fs.readFileSync(builtIndexPath, 'utf8');
    if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(builtHtml)) {
      errors.push('Inline <script> tag found in dist/index.html');
    }
    if (/<style\b/i.test(builtHtml)) {
      errors.push('Inline <style> tag found in dist/index.html');
    }

    // Measure initial JS gzip size (scripts referenced directly by index.html via src or modulepreload)
    const entryScripts = new Set();
    for (const m of builtHtml.matchAll(/(?:src|href)=["'](\/?assets\/[^"']+\.js)["']/g)) {
      entryScripts.add(m[1].replace(/^\//, ''));
    }
    let totalGzip = 0;
    for (const relScript of entryScripts) {
      const fp = path.join(distDir, relScript);
      if (fs.existsSync(fp)) {
        const buf = fs.readFileSync(fp);
        totalGzip += zlib.gzipSync(buf).length;
      }
    }
    const kb = totalGzip / 1024;
    console.log(
      `Bundle check: initial JS (${entryScripts.size} chunks) = ${kb.toFixed(1)} KB gzip (budget <= 150 KB)`,
    );
    if (kb > 150) {
      errors.push(`Initial JS bundle ${kb.toFixed(1)} KB gzip exceeds 150 KB budget`);
    }
  }

  for (const file of walk(path.join(distDir, 'assets'), ['.js'])) {
    const rel = path.relative(rootDir, file);
    const text = fs.readFileSync(file, 'utf8');
    if (/\beval\s*\(/.test(text)) {
      errors.push(`Built bundle contains eval( in ${rel}`);
    }
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text)) {
      errors.push(`Built bundle contains Google Fonts URL in ${rel}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Static security & bundle check FAILED:');
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

console.log('OK: Static security scan passed with 0 issues.');
