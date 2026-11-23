import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const headersPath = path.join(rootDir, 'public', '_headers');

if (!fs.existsSync(headersPath)) {
  console.error('FAIL: Missing public/_headers');
  process.exit(1);
}

const content = fs.readFileSync(headersPath, 'utf8');

const requiredHeaders = [
  'Content-Security-Policy:',
  'Strict-Transport-Security:',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: no-referrer',
  'Permissions-Policy:',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin',
  'X-Frame-Options: DENY',
];

const requiredCspDirectives = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
  "require-trusted-types-for 'script'",
];

const forbiddenPatterns = [
  /unsafe-inline/i,
  /unsafe-eval/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /http:\/\//i,
];

const errors = [];

for (const h of requiredHeaders) {
  if (!content.includes(h)) {
    errors.push(`Missing required header: ${h}`);
  }
}

const cspLine = content
  .split(/\r?\n/)
  .find((line) => line.trim().startsWith('Content-Security-Policy:'));

if (!cspLine) {
  errors.push('Missing Content-Security-Policy line');
} else {
  for (const dir of requiredCspDirectives) {
    if (!cspLine.includes(dir)) {
      errors.push(`Missing CSP directive: ${dir}`);
    }
  }
}

for (const rx of forbiddenPatterns) {
  if (rx.test(content)) {
    errors.push(`Forbidden pattern matched in public/_headers: ${rx}`);
  }
}

if (!content.includes('Cache-Control: public, max-age=31536000, immutable')) {
  errors.push('Missing immutable cache header for hashed assets');
}
if (!content.includes('Cache-Control: no-cache')) {
  errors.push('Missing no-cache header for index.html / sw.js');
}

if (errors.length > 0) {
  console.error('Header security check FAILED:');
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

const vercelPath = path.join(rootDir, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercelRaw = fs.readFileSync(vercelPath, 'utf8');
  const vercelCfg = JSON.parse(vercelRaw);
  const allHeaders = (vercelCfg.headers ?? []).flatMap((rule) =>
    (rule.headers ?? []).map((h) => `${h.key}: ${h.value}`),
  );
  const joined = allHeaders.join('\n');
  const vErrors = [];
  for (const h of requiredHeaders) {
    if (!joined.includes(h)) vErrors.push(`vercel.json missing required header: ${h}`);
  }
  const vCsp = allHeaders.find((h) => h.startsWith('Content-Security-Policy:'));
  if (!vCsp) {
    vErrors.push('vercel.json missing Content-Security-Policy');
  } else {
    for (const dir of requiredCspDirectives) {
      if (!vCsp.includes(dir)) vErrors.push(`vercel.json missing CSP directive: ${dir}`);
    }
  }
  for (const rx of forbiddenPatterns) {
    if (rx.test(joined)) vErrors.push(`Forbidden pattern matched in vercel.json headers: ${rx}`);
  }
  if (!joined.includes('Cache-Control: public, max-age=31536000, immutable')) {
    vErrors.push('vercel.json missing immutable cache header for hashed assets');
  }
  if (!joined.includes('Cache-Control: no-cache')) {
    vErrors.push('vercel.json missing no-cache header for index.html / sw.js');
  }
  if (vErrors.length > 0) {
    console.error('Vercel header security check FAILED:');
    for (const err of vErrors) console.error('  -', err);
    process.exit(1);
  }
}

console.log('OK: public/_headers and vercel.json passed all CSP and security header checks.');
