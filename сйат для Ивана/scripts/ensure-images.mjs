/**
 * Проверка картинок проекта и автоматическая докачка недостающих.
 *
 * Зачем: при скачивании/копировании проекта бинарные файлы (jpg/png) иногда
 * теряются или портятся — тогда на сайте «не отображаются картинки».
 * Скрипт проверяет каждый файл из public/images и, если он отсутствует или повреждён,
 * заново скачивает его с Wikimedia Commons (по данным src/data/photo-manifest.json).
 *
 * Запуск: npm run images:fix
 * (автоматически вызывается перед `npm run build:static`; ошибки сети не прерывают сборку —
 *  на сайте в этом случае сработают запасные источники изображений.)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const MANIFEST = path.join(ROOT, "src/data/photo-manifest.json");
const UA = "VOV-EduSite/1.0 (school history project; image restore script)";
const QUIET = process.argv.includes("--quiet");

/** Художественные иллюстрации (созданы для сайта, скачать их неоткуда) */
const GENERATED = [
  "/images/hub-hero.jpg",
  "/images/topics/t1-1939.jpg",
  "/images/topics/t2-1941.jpg",
  "/images/topics/t3-occupation.jpg",
  "/images/topics/t4-partisans.jpg",
  "/images/topics/t5-underground.jpg",
  "/images/topics/t6-liberation.jpg",
  "/images/topics/t7-bagration.jpg",
  "/images/topics/t8-victory.jpg",
  "/images/gallery/partisan-parade.jpg",
];

/** Файл существует и действительно является JPEG/PNG/WebP/GIF */
function isValidImage(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 512) return false;
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const gif = buf.toString("ascii", 0, 3) === "GIF";
    const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
    return jpeg || png || gif || webp;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    if (!isValidImage(dest)) throw new Error("получен не файл изображения");
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    console.warn("⚠ Не найден src/data/photo-manifest.json — проверка пропущена.");
    return;
  }

  const entries = Object.entries(manifest).filter(([, m]) => m.src && m.file);
  const missing = entries.filter(([, m]) => !isValidImage(path.join(PUBLIC, m.src)));
  const missingGenerated = GENERATED.filter((p) => !isValidImage(path.join(PUBLIC, p)));

  if (missing.length === 0 && missingGenerated.length === 0) {
    if (!QUIET) console.log(`✔ Картинки на месте: ${entries.length} фото с Wikimedia Commons и ${GENERATED.length} иллюстраций.`);
    return;
  }

  let restored = 0;
  if (missing.length) {
    console.log(`Не хватает или повреждено ${missing.length} фото — скачиваю с Wikimedia Commons…`);
    for (const [key, m] of missing) {
      const width = key.startsWith("p-") ? 480 : 1200;
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(m.file)}?width=${width}`;
      try {
        await download(url, path.join(PUBLIC, m.src));
        restored += 1;
        console.log(`  ✓ ${m.src}`);
      } catch (e) {
        console.log(`  ✗ ${m.src} — ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log(`Восстановлено: ${restored} из ${missing.length}.`);
    if (restored < missing.length) {
      console.log("  Остальные фото сайт подгрузит напрямую с Wikimedia Commons (нужен интернет).");
    }
  }

  if (missingGenerated.length) {
    console.log(`⚠ Нет ${missingGenerated.length} художественных иллюстраций (обложки тем):`);
    missingGenerated.forEach((p) => console.log(`    public${p}`));
    console.log("  Сайт покажет вместо них реальные фотографии по теме. Чтобы вернуть иллюстрации,");
    console.log("  скопируйте папку public/images из исходного проекта целиком.");
  }
}

main().catch((e) => {
  // Никогда не прерываем сборку из-за картинок
  console.warn("⚠ Проверка картинок не выполнена:", e.message);
});
