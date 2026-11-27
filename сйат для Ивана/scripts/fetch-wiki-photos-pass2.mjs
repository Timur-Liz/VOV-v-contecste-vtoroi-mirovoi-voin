/**
 * Второй проход: для персон без свободного портрета в ру-вики пробуем
 * английскую и белорусскую Википедию (также только файлы с Wikimedia Commons).
 * Запуск: node scripts/fetch-wiki-photos-pass2.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const UA = "VOV-EduSite/1.0 (school history project; contact: teacher@example.org)";
const OUT_DIR = path.resolve("public/images/wiki");
const MANIFEST = path.resolve("src/data/photo-manifest.json");

// key → [enwiki title, bewiki title]
const CANDIDATES = {
  "p-kovalev": ["Mikhail Kovalyov (general)", "Міхаіл Пракопавіч Кавалёў"],
  "p-pritytsky": ["Sergei Pritytsky", "Сяргей Восіпавіч Прытыцкі"],
  "p-pavlov": ["Dmitry Pavlov (general)", "Дзмітрый Рыгоравіч Паўлаў"],
  "p-gavrilov": ["Pyotr Gavrilov", "Пётр Міхайлавіч Гаўрылаў"],
  "p-kizhevatov": ["Andrey Kizhevatov", "Андрэй Мітрафанавіч Кіжаватаў"],
  "p-russiyanov": ["Ivan Russiyanov", "Іван Мікітавіч Русіянаў"],
  "p-romanov": ["Mikhail Timofeyevich Romanov", "Міхаіл Цімафеевіч Раманаў"],
  "p-kutepov": ["Semyon Kutepov", "Сямён Фёдаравіч Куцепаў"],
  "p-petrovsky": ["Leonid Petrovsky", "Леанід Рыгоравіч Пятроўскі"],
  "p-flerov": ["Ivan Flyorov", "Іван Андрэевіч Флёраў"],
  "p-gottberg": ["Curt von Gottberg", "Курт фон Готберг"],
  "p-mazanik": ["Yelena Mazanik", "Алена Рыгораўна Мазанік"],
  "p-troyan": ["Nadezhda Troyan", "Надзея Віктараўна Траян"],
  "p-kaminsky": ["Yuzif Kaminsky", "Іосіф Іосіфавіч Камінскі"],
  "p-pavlovsky": ["Fyodor Pavlovsky", "Фёдар Іларыёнавіч Паўлоўскі"],
  "p-kalinin": ["Pyotr Kalinin (politician)", "Пётр Захаравіч Калінін"],
  "p-lobanok": ["Vladimir Lobanok", "Уладзімір Елісеевіч Лабанок"],
  "p-kazey": ["Marat Kazei", "Марат Іванавіч Казей"],
  "p-kazinets": ["Isay Kazinets", "Ісай Паўлавіч Казінец"],
  "p-kabushkin": ["Ivan Kabushkin", "Іван Канстанцінавіч Кабушкін"],
  "p-klumov": ["Yevgeny Klumov", "Яўген Уладзіміравіч Клумаў"],
  "p-krylovich": ["Fyodor Krylovich", "Фёдар Андрэевіч Крыловіч"],
  "p-zenkova": ["Yefrosinya Zenkova", "Ефрасіння Савельеўна Зянькова"],
  "p-portnova": ["Zina Portnova", "Зінаіда Мартынаўна Партнова"],
  "p-gorbatov": ["Aleksandr Gorbatov", "Аляксандр Васілевіч Гарбатаў"],
  "p-burdeyny": ["Aleksei Burdeyny", "Аляксей Сямёнавіч Бурдзейны"],
  "p-frolikov": ["Dmitry Frolikov", "Дзмітрый Георгіевіч Фролікаў"],
  "p-smirnov": ["Yuri Smirnov (soldier)", "Юрый Васілевіч Смірноў"],
  "p-kiselev": ["Kuzma Kiselyov", "Кузьма Венядзіктавіч Кісялёў"],
  "p-gorovets": ["Aleksandr Gorovets", "Аляксандр Канстанцінавіч Гаравец"],
  "p-golovachev": ["Pavel Golovachev", "Павел Якаўлевіч Галавачоў"],
  "p-smolyachkov": ["Feodosy Smolyachkov", "Феадосій Арцёмавіч Смалячкоў"],
  "p-kovzan": ["Boris Kovzan", "Барыс Іванавіч Каўзан"],
  "p-lisovets": ["Nadezhda Lisovets", "Надзея Лісавец"],
  "p-masherov": ["Pyotr Masherov", "Пётр Міронавіч Машэраў"],
  "p-shmyrev": ["Minai Shmyrov", "Мінай Піліпавіч Шмыроў"],
  "e-brest-1941": ["Defense of Brest Fortress", "Абарона Брэсцкай крэпасці"],
  "e-khatyn": ["Khatyn massacre", "Хатынь"],
  "e-young-avengers": ["Young Avengers (Obol)", "Юныя мсціўцы"],
  "e-partisan-parade": ["Minsk partisan parade", "Партызанскі парад у Мінску"],
  "e-kurgan": ["Mound of Glory", "Курган Славы"],
  "e-museum": ["Belarusian Great Patriotic War Museum", "Беларускі дзяржаўны музей гісторыі Вялікай Айчыннай вайны"],
  "e-un-1945": ["United Nations Conference on International Organization", "Канферэнцыя ў Сан-Францыска"],
  "e-rail-war": ["Operation Concert", "Рэйкавая вайна"],
  "e-gomel-1943": ["Gomel–Rechitsa offensive", "Гомельска-Рэчыцкая аперацыя"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function pageImage(wiki, title, size) {
  const data = await api(`https://${wiki}.wikipedia.org/w/api.php`, {
    action: "query", redirects: "1", prop: "pageimages", piprop: "original|name|thumbnail", pithumbsize: String(size), titles: title,
  });
  const page = data.query?.pages?.[0];
  if (!page || page.missing || !page.original) return null;
  return { resolvedTitle: page.title, file: page.pageimage, original: page.original.source, thumb: page.thumbnail?.source };
}
const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function commonsMeta(file) {
  const data = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query", prop: "imageinfo", iiprop: "extmetadata|mime", iiextmetadatafilter: "Artist|LicenseShortName|ImageDescription", titles: `File:${file}`,
  });
  const info = data.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  return { mime: info.mime, artist: strip(m.Artist?.value).slice(0, 120), license: strip(m.LicenseShortName?.value), description: strip(m.ImageDescription?.value).slice(0, 400) };
}
async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  // Удаляем заведомо ошибочные совпадения первого прохода
  for (const bad of ["p-kaminsky", "p-lisovets", "e-un-1945", "e-gomel-1943", "e-rail-war", "e-sbm", "p-shmyrev", "p-masherov"]) {
    if (manifest[bad]?.src) await fs.rm(path.join(OUT_DIR, path.basename(manifest[bad].src)), { force: true });
    delete manifest[bad];
  }

  for (const [key, [en, be]] of Object.entries(CANDIDATES)) {
    if (manifest[key]?.src) continue;
    const size = key.startsWith("p-") ? 480 : 1200;
    let found = null;
    for (const [wiki, title] of [["en", en], ["be", be]]) {
      try {
        const img = await pageImage(wiki, title, size);
        if (img && img.original.includes("/wikipedia/commons/")) { found = { ...img, wiki }; break; }
      } catch { /* next */ }
      await sleep(100);
    }
    if (!found) { console.log(`✗ ${key}: не найдено`); continue; }
    try {
      const meta = await commonsMeta(found.file);
      if (!meta || meta.mime === "image/svg+xml") { console.log(`✗ ${key}: svg`); continue; }
      const src = found.thumb ?? found.original;
      const ext = /\.png(\?|$)/i.test(src) ? "png" : "jpg";
      const fileName = `${key}.${ext}`;
      await download(src, path.join(OUT_DIR, fileName));
      manifest[key] = { title: found.resolvedTitle, file: found.file, src: `/images/wiki/${fileName}`, artist: meta.artist, license: meta.license, description: meta.description, wiki: found.wiki };
      console.log(`✓ ${key} (${found.wiki}): ${found.resolvedTitle} — ${found.file} [${meta.license}]`);
    } catch (e) {
      console.log(`! ${key}: ${e.message}`);
    }
    await sleep(120);
  }
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Итого файлов: ${Object.values(manifest).filter((m) => m.src).length}`);
}
main();
