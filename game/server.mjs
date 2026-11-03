import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const base = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

export async function startServer({ port = 4176, root = base } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!(name === 'index.html' || name === 'style.css' || /^src\/[a-z-]+\.js$/.test(name))) {
        res.writeHead(404).end('Not found');
        return;
      }
      const body = await readFile(path.join(root, name));
      res.writeHead(200, {
        'Content-Type': types[path.extname(name)],
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      }).end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv.includes('--dist') ? path.join(base, 'dist') : base;
  const server = await startServer({ port: Number(process.env.PORT || 4176), root });
  console.log(`여섯 번째 새벽 → http://127.0.0.1:${server.address().port}`);
}
