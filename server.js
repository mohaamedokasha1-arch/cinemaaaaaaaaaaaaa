// Tiny static-file server for Railway or any Node host. Build first with `npm run build`.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.PORT) || 3000;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
};

http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (pathname.includes('\0')) { res.writeHead(400); res.end('Bad request'); return; }
  const requested = resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }

  let target = requested;
  try {
    const file = await stat(requested);
    if (!file.isFile()) target = resolve(root, 'index.html');
  } catch {
    // Only navigation requests fall back to React Router; absent assets stay 404.
    if (extname(pathname) || !req.headers.accept?.includes('text/html')) {
      res.writeHead(404); res.end('Not found'); return;
    }
    target = resolve(root, 'index.html');
  }
  try {
    const file = await stat(target);
    const extension = extname(target);
    const headers = {
      'Content-Type': mime[extension] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'Cache-Control': target.endsWith('/index.html') ? 'no-cache' : pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    };
    let start = 0;
    let end = file.size - 1;
    let partial = false;
    if (req.headers.range && file.size > 0) {
      partial = true;
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { 'Content-Range': `bytes */${file.size}` }); res.end(); return;
      }
      if (!match[1]) {
        start = Math.max(0, file.size - Number(match[2]));
      } else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), end);
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${file.size}` }); res.end(); return;
      }
      headers['Content-Range'] = `bytes ${start}-${end}/${file.size}`;
    }
    headers['Content-Length'] = file.size ? end - start + 1 : 0;
    res.writeHead(partial ? 206 : 200, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(target, file.size ? { start, end } : undefined).pipe(res);
  } catch { res.writeHead(500); res.end('Build not found. Run npm run build first.'); }
}).listen(port, '0.0.0.0', () => console.log(`Cinema Al Arab is listening on 0.0.0.0:${port}`));
