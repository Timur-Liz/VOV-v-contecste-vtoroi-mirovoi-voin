/**
 * Простой локальный сервер для папки out/ (без зависимостей).
 * Запуск: npm run preview:static  →  http://localhost:4173
 */
import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.env.PORT) || 4173;
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

if (!existsSync(ROOT)) {
  console.error("Папка out/ не найдена. Сначала выполните: npm run build:static");
  process.exit(1);
}

function send(res, filePath, status = 200) {
  res.writeHead(status, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (BASE && urlPath.startsWith(BASE)) urlPath = urlPath.slice(BASE.length) || "/";
  let filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath) && existsSync(`${filePath}.html`)) filePath = `${filePath}.html`;
  if (existsSync(filePath)) return send(res, filePath);
  const notFound = join(ROOT, "404.html");
  if (existsSync(notFound)) return send(res, notFound, 404);
  res.writeHead(404).end("Not found");
}).listen(PORT, () => {
  console.log(`Статический сайт: http://localhost:${PORT}${BASE}/`);
});
