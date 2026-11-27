/**
 * Сборка АВТОНОМНОГО сайта на чистом HTML/CSS/JS в корне проекта:
 *
 *   index.html                         ← главная (хаб)
 *   topics/index.html                  ← список тем
 *   topics/<тема>/index.html           ← страница темы
 *   404.html, .nojekyll                ← для GitHub Pages
 *   assets/css/site.css                ← все стили одним файлом
 *   assets/js/site.js                  ← интерактив (пишется вручную, не генерируется)
 *   assets/data/topic-XX-<тема>.js     ← данные темы: карта, конспект, викторина
 *   assets/data/geo.js                 ← границы Беларуси и реки
 *   assets/vendor/leaflet.js           ← библиотека карт
 *   public/images/…                    ← картинки (используются как есть)
 *
 * Такой сайт открывается двойным щелчком по index.html (file://), работает в Live Server
 * и на GitHub Pages («Deploy from a branch», корень репозитория) — без сервера и без сборки.
 *
 * Как это устроено: Next.js экспортирует готовую разметку страниц (npm run build:static),
 * а этот скрипт убирает из неё всё, что требует сервера (скрипты Next.js, абсолютные пути),
 * и подключает assets/js/site.js.
 *
 * Запуск:  npm run build:html            (после правок в src/data или src/components)
 *          npm run build:html -- --skip-build   (не пересобирать out/, взять готовую)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const SKIP_BUILD = process.argv.includes("--skip-build");
const KEEP_OUT = process.argv.includes("--keep-out");

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

/* ------------------------------------------------------------------ */
/* 1. Статический экспорт Next.js (готовая разметка страниц)           */
/* ------------------------------------------------------------------ */
if (!SKIP_BUILD) {
  const result = spawnSync(process.execPath, ["scripts/build-static.mjs"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "" }, // автономный сайт не зависит от подпапки
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("✗ Нет папки out/. Запустите без --skip-build: npm run build:html");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. Данные тем из src/data (TypeScript → объекты)                    */
/* ------------------------------------------------------------------ */
const moduleCache = new Map();
function loadTs(file) {
  file = path.resolve(file);
  if (moduleCache.has(file)) return moduleCache.get(file).exports;
  if (file.endsWith(".json")) {
    const mod = { exports: JSON.parse(read(file)) };
    moduleCache.set(file, mod);
    return mod.exports;
  }
  const { outputText } = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const mod = { exports: {} };
  moduleCache.set(file, mod);
  const localRequire = (spec) => {
    if (!spec.startsWith(".")) return require(spec);
    const base = path.resolve(path.dirname(file), spec);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return loadTs(candidate);
    }
    throw new Error(`Не найден модуль ${spec} (из ${file})`);
  };
  new Function("exports", "require", "module", outputText)(mod.exports, localRequire, mod);
  return mod.exports;
}
const { topics } = loadTs("src/data/topics/index.ts");
const bySlug = new Map(topics.map((t) => [t.slug, t]));
const pad = (n) => String(n).padStart(2, "0");
const dataFile = (t) => `topic-${pad(t.number)}-${t.slug}.js`;

/* ------------------------------------------------------------------ */
/* 3. Очистка прошлой сборки (assets/js/site.js — исходник, не трогаем) */
/* ------------------------------------------------------------------ */
for (const p of ["topics", "assets/css", "assets/data", "assets/vendor", "index.html", "404.html"]) {
  fs.rmSync(path.join(ROOT, p), { recursive: true, force: true });
}
if (!fs.existsSync(path.join(ROOT, "assets/js/site.js"))) {
  console.error("✗ Не найден assets/js/site.js — без него сайт не будет интерактивным.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 4. Стили: один файл                                                 */
/* ------------------------------------------------------------------ */
const cssDir = path.join(OUT, "_next/static/chunks");
let css = fs
  .readdirSync(cssDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => read(path.join(cssDir, f)))
  .join("\n");
// картинки стандартных элементов Leaflet (переключатель слоёв, синий маркер) на сайте не используются
css = css.replace(/url\((?:\.\.\/media\/|\/_next\/)[^)]*\)/g, "none");
css =
  "/* Стили сайта одним файлом. Сгенерировано: npm run build:html (исходник — src/app/globals.css). */\n" +
  css +
  `
/* ---- Автономная версия: содержимое видно и без JavaScript ---- */
.reveal{opacity:1;transform:none}
.js-anim .reveal:not(.is-visible){opacity:0;transform:translateY(22px)}
@media (prefers-reduced-motion:reduce){.js-anim .reveal:not(.is-visible){opacity:1;transform:none}}
`;
write(path.join(ROOT, "assets/css/site.css"), css);

/* ------------------------------------------------------------------ */
/* 5. Библиотека карт и данные                                         */
/* ------------------------------------------------------------------ */
fs.mkdirSync(path.join(ROOT, "assets/vendor"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "node_modules/leaflet/dist/leaflet.js"), path.join(ROOT, "assets/vendor/leaflet.js"));

const geo = {
  adm1: JSON.parse(read(path.join(ROOT, "public/geo/belarus-adm1.geojson"))),
  adm0: JSON.parse(read(path.join(ROOT, "public/geo/belarus-adm0.geojson"))),
  rivers: JSON.parse(read(path.join(ROOT, "public/geo/rivers.geojson"))),
};
write(
  path.join(ROOT, "assets/data/geo.js"),
  "/* Границы Беларуси и областей (geoBoundaries, CC BY 4.0) и реки (Natural Earth). Сгенерировано: npm run build:html */\n" +
    `window.VOV_GEO = ${JSON.stringify(geo)};\n`,
);

for (const t of topics) {
  const data = {
    slug: t.slug,
    number: t.number,
    title: t.title,
    map: t.map, // центр, точки событий, линии
    summary: t.summary, // конспект: short / medium / full
    quiz: t.quiz, // вопросы викторины
  };
  write(
    path.join(ROOT, "assets/data", dataFile(t)),
    `/* Данные темы ${t.number}: «${t.shortTitle}» — карта, конспект, викторина.\n   Сгенерировано из src/data/topics (npm run build:html). */\n` +
      `window.VOV_TOPIC = ${JSON.stringify(data, null, 1)};\n`,
  );
}

/* ------------------------------------------------------------------ */
/* 6. Страницы                                                         */
/* ------------------------------------------------------------------ */
const THEME_SCRIPT =
  "<script>(function(){try{var t=localStorage.getItem('vov_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();</script>";
const FAVICON =
  `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%237a1f2b'/%3E%3Cpath d='M32 12l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 41.6l-12 7.1 3-13.5-10.3-9.2 13.7-1.4z' fill='%23f1d27a'/%3E%3C/svg%3E"/>`;
const CSS_NOTE = (prefix) =>
  `<div class="css-missing-note" style="padding:16px;margin:0 0 16px;border:2px solid #7a1f2b;background:#fff7e6;color:#1f1c17;font-family:system-ui,sans-serif;line-height:1.5">` +
  `<strong>Стили сайта не загрузились.</strong> Не найден файл <code>${prefix}assets/css/site.css</code>. ` +
  `Папки <code>assets</code>, <code>topics</code> и <code>public</code> должны лежать рядом с <code>index.html</code> — скопируйте или загрузите проект целиком.</div>`;

function transform(html, depth, topic) {
  const prefix = depth === 0 ? "./" : "../".repeat(depth);

  // 1) всё, что относится к Next.js и требует сервера
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  html = html.replace(/<link\b[^>]*href="\/_next\/[^"]*"[^>]*>/g, "");
  html = html.replace(/<meta name="next-size-adjust"[^>]*>/g, "");
  html = html.replace(/<meta (?:property|name)="(?:og|twitter):image[^"]*"[^>]*>/g, ""); // абсолютные адреса сборочной машины

  // 2) ссылки между страницами — относительные и с явным index.html (нужно для file://)
  html = html.replace(/href="\/(#[^"]*)?"/g, (_, hash = "") => `href="${prefix}index.html${hash}"`);
  html = html.replace(/href="\/topics\/"/g, `href="${prefix}topics/index.html"`);
  html = html.replace(/href="\/topics\/([a-z0-9-]+)\/"/g, (_, slug) => `href="${prefix}topics/${slug}/index.html"`);

  // 3) картинки лежат в public/images
  html = html.replace(/(src|href)="((?:\.\.\/)+|\.\/)images\//g, (_, attr, rel) => `${attr}="${rel}public/images/`);

  // 4) корень сайта, стили, тема оформления
  html = html.replace(/<html\b/, `<html data-root="${prefix}"`);
  html = html.replace("</head>", `${FAVICON}<link rel="stylesheet" href="${prefix}assets/css/site.css"/>${THEME_SCRIPT}</head>`);
  html = html.replace(/<div class="css-missing-note"[\s\S]*?<\/div>/, CSS_NOTE(prefix));

  // 5) скрипты автономной версии
  const scripts = [];
  if (topic) {
    scripts.push(`${prefix}assets/data/geo.js`, `${prefix}assets/data/${dataFile(topic)}`, `${prefix}assets/vendor/leaflet.js`);
  }
  scripts.push(`${prefix}assets/js/site.js`);
  html = html.replace("</body>", `${scripts.map((s) => `<script src="${s}"></script>`).join("")}</body>`);

  return "<!-- Автономная страница. Сгенерировано: npm run build:html. Интерактив — assets/js/site.js -->\n" + html.replace(/^<!DOCTYPE html>/i, "<!DOCTYPE html>");
}

const pages = [{ from: "index.html", to: "index.html", depth: 0 }];
if (fs.existsSync(path.join(OUT, "topics/index.html"))) pages.push({ from: "topics/index.html", to: "topics/index.html", depth: 1 });
for (const t of topics) pages.push({ from: `topics/${t.slug}/index.html`, to: `topics/${t.slug}/index.html`, depth: 2, topic: t });

const problems = [];
for (const page of pages) {
  const src = path.join(OUT, page.from);
  if (!fs.existsSync(src)) {
    problems.push(`нет страницы ${page.from}`);
    continue;
  }
  let html = transform(read(src), page.depth, page.topic);
  // doctype должен быть первой строкой
  html = html.replace(/^(<!--[\s\S]*?-->\n)(<!DOCTYPE html>)/i, "$2\n$1");
  if (/(?:href|src)="\/(?!\/)/.test(html)) problems.push(`в ${page.to} остались абсолютные пути`);
  write(path.join(ROOT, page.to), html);
}

/* ------------------------------------------------------------------ */
/* 7. Страница 404 и служебные файлы GitHub Pages                      */
/* ------------------------------------------------------------------ */
write(
  path.join(ROOT, "404.html"),
  `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Страница не найдена — ВОВ в истории Беларуси</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4efe4;color:#1f1c17;font-family:Georgia,"Times New Roman",serif;padding:24px}
  .box{max-width:520px;text-align:center;background:#fffcf5;border:1px solid #d8cdb8;border-radius:20px;padding:40px 28px}
  p{font-family:system-ui,sans-serif;color:#4f4a42;line-height:1.6}
  a{display:inline-block;margin-top:12px;padding:12px 22px;border-radius:999px;background:#1f3d2b;color:#fffaf0;text-decoration:none;font-family:system-ui,sans-serif;font-weight:700}
</style>
</head>
<body>
<div class="box">
  <h1>Такой страницы нет</h1>
  <p>Проверьте адрес или вернитесь к списку тем.</p>
  <a id="home" href="./index.html">Ко всем темам</a>
</div>
<script>
  // На GitHub Pages сайт проекта лежит в подпапке /<репозиторий>/ — ведём ссылку туда
  (function () {
    var seg = location.pathname.split("/")[1] || "";
    var base = /\\.github\\.io$/.test(location.hostname) && seg && seg.indexOf(".") === -1 ? "/" + seg + "/" : "/";
    document.getElementById("home").href = base;
  })();
</script>
</body>
</html>
`,
);
// Без .nojekyll GitHub Pages прогоняет репозиторий через Jekyll (медленно и с сюрпризами)
write(path.join(ROOT, ".nojekyll"), "");

/* ------------------------------------------------------------------ */
/* 8. Итог                                                             */
/* ------------------------------------------------------------------ */
const kb = (p) => `${Math.round(fs.statSync(path.join(ROOT, p)).size / 1024)} КБ`;
console.log("\n✔ Автономный сайт собран в корне проекта:");
console.log(`    index.html (${kb("index.html")}), topics/ — ${topics.length} тем, assets/css/site.css (${kb("assets/css/site.css")})`);
console.log(`    assets/data — ${topics.length} файлов тем + geo.js, assets/vendor/leaflet.js`);
if (problems.length) {
  console.log("\n⚠ Обратите внимание:");
  problems.forEach((p) => console.log(`    • ${p}`));
  process.exitCode = 1;
} else {
  console.log("\n  Откройте index.html двойным щелчком — сайт работает без сервера.");
  console.log("  GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root).");
}
// Промежуточная папка out/ больше не нужна: сайт теперь лежит в корне проекта
if (!KEEP_OUT) fs.rmSync(OUT, { recursive: true, force: true });
void bySlug;
