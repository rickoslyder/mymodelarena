import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runControlMatch } from './orchestrator.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(root, 'public');
const port = Number(process.env.PORT ?? 4310);
const cache = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}

function sendJson(response, status, body, headers = {}) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(JSON.stringify(body));
}

function normalizeSeed(value) {
  const seed = String(value ?? 'arena-demo-001').trim();
  if (seed.length < 1 || seed.length > 120) throw new TypeError('Seed must contain 1–120 characters.');
  return seed;
}

async function demoArtifact(seed) {
  let pending = cache.get(seed);
  if (!pending) {
    pending = runControlMatch(seed).then((result) => result.publicArtifact);
    cache.set(seed, pending);
    pending.catch(() => cache.delete(seed));
    while (cache.size > 32) cache.delete(cache.keys().next().value);
  }
  return pending;
}

function serveStatic(pathname, response) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { response.statusCode = 400; response.end('Bad request'); return; }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = normalize(join(publicRoot, relative));
  if (!candidate.startsWith(publicRoot)) {
    response.statusCode = 400;
    response.end('Bad request');
    return;
  }
  const filePath = existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(publicRoot, 'index.html');
  if (!existsSync(filePath)) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }
  response.statusCode = 200;
  response.setHeader('Content-Type', MIME_TYPES[extname(filePath)] ?? 'application/octet-stream');
  response.setHeader('Cache-Control', extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600');
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  securityHeaders(response);
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname === '/api/health') {
      return sendJson(response, 200, {
        status: 'ok',
        service: 'arenalab',
        version: '1.0.0',
        publicProviderMode: 'scripted-control-only',
        timestamp: new Date().toISOString(),
      });
    }
    if (url.pathname === '/api/demo') {
      if (request.method !== 'GET') return sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }, { Allow: 'GET' });
      const seed = normalizeSeed(url.searchParams.get('seed'));
      return sendJson(response, 200, await demoArtifact(seed));
    }
    return serveStatic(url.pathname, response);
  } catch (error) {
    return sendJson(response, error instanceof TypeError ? 400 : 500, {
      error: {
        code: error instanceof TypeError ? 'INVALID_REQUEST' : 'RUN_FAILED',
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ArenaLab listening on http://localhost:${port}`);
});
