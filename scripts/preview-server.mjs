import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const headersFile = path.join(rootDir, 'public', '_headers');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

function parseHeadersFile(filePath) {
  const rules = [];
  if (!fs.existsSync(filePath)) return rules;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const name = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        current.headers.push([name, value]);
      }
    }
  }
  return rules;
}

function matchPattern(pattern, pathname) {
  if (pattern === '/*') return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return pathname.startsWith(prefix);
  }
  return pathname === pattern;
}

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 4173;
const headerRules = parseHeadersFile(headersFile);

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let safePath;
  try {
    safePath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const normalized = path.posix.normalize(safePath);
  if (normalized.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = path.join(distDir, normalized === '/' ? 'index.html' : normalized);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const resolvedDist = path.resolve(distDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDist)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(resolvedFile).toLowerCase();
  const resHeaders = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
  };

  for (const rule of headerRules) {
    if (matchPattern(rule.pattern, normalized)) {
      for (const [k, v] of rule.headers) {
        // Local HTTP server omits upgrade-insecure-requests on http://127.0.0.1
        // only if --local-http is passed; otherwise keep exact headers.
        if (
          k.toLowerCase() === 'content-security-policy' &&
          args.includes('--strip-upgrade-insecure')
        ) {
          resHeaders[k] = v.replace(/;\s*upgrade-insecure-requests/i, '');
        } else {
          resHeaders[k] = v;
        }
      }
    }
  }

  // Note: Chromium ignores upgrade-insecure-requests on localhost/127.0.0.1 HTTP automatically,
  // or upgrades on non-localhost. Keep exact header from _headers by default.
  res.writeHead(200, resHeaders);
  fs.createReadStream(resolvedFile).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview server (with _headers CSP) running at http://127.0.0.1:${port}/`);
});
