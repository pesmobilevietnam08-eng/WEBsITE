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

console.log('OK: public/_headers passed all CSP and security header checks.');
