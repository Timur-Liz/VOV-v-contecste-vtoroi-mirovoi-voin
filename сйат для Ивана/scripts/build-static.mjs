/**
 * Статическая сборка сайта (папка out/) для GitHub Pages, Live Server и т. п.
 *
 * Next.js не умеет экспортировать API-маршруты статически, поэтому на время сборки
 * папка src/app/api временно убирается, а затем возвращается на место
 * (в том числе при ошибке сборки и при нажатии Ctrl+C).
 *
 * Запуск: npm run build:static
 */
import { cpSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const API_DIR = "src/app/api";
const BACKUP_DIR = ".api-backup";

/** Перенос папки: rename, а если файлы заняты (Windows + открытый редактор) — копирование */
function moveDir(from, to) {
  if (!existsSync(from)) return;
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  try {
    renameSync(from, to);
  } catch {
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

let restored = false;
function restoreApi() {
  if (restored) return;
  restored = true;
  if (existsSync(BACKUP_DIR)) moveDir(BACKUP_DIR, API_DIR);
}
process.on("SIGINT", () => {
  restoreApi();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restoreApi();
  process.exit(143);
});

// 0. Если прошлая сборка была прервана — возвращаем API на место
if (existsSync(BACKUP_DIR) && !existsSync(API_DIR)) moveDir(BACKUP_DIR, API_DIR);

// 1. Проверяем картинки (недостающие фото докачиваются с Wikimedia Commons)
spawnSync(process.execPath, ["scripts/ensure-images.mjs"], { stdio: "inherit" });

// 2. Старую сборку удаляем, чтобы в out/ не оставалось файлов с чужими путями
rmSync("out", { recursive: true, force: true });

// 3. Сборка без API-маршрутов
moveDir(API_DIR, BACKUP_DIR);
let status = 1;
try {
  const nextBin = require.resolve("next/dist/bin/next");
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
  status = result.status ?? 1;
} finally {
  restoreApi();
}

if (status === 0) {
  // Без этого файла GitHub Pages игнорирует папку _next (Jekyll пропускает «_»-папки)
  writeFileSync("out/.nojekyll", "");
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  console.log(`\n✔ Статический сайт собран в папку out/${base ? ` (подпапка: ${base})` : ""}`);
  if (base) {
    console.log(`  Эта сборка рассчитана на адрес вида https://<логин>.github.io${base}/`);
    console.log(`  Локальный просмотр: NEXT_PUBLIC_BASE_PATH=${base} npm run preview:static`);
  } else {
    console.log("  Просмотр: npm run preview:static  →  http://localhost:4173");
    console.log("  (Это промежуточный экспорт Next.js. Готовый сайт для двойного щелчка — index.html в корне проекта.)");
  }
} else {
  console.error("\n✗ Сборка не удалась. Сообщение об ошибке — выше.");
}
process.exit(status);
