/**
 * Загрузка свободных (Wikimedia Commons) портретов и исторических фото
 * для тем сайта. Запуск: node scripts/fetch-wiki-photos.mjs
 *
 * Берётся «главное изображение» статьи русской Википедии; используются ТОЛЬКО
 * файлы, размещённые на Wikimedia Commons (свободные лицензии). Для каждого файла
 * сохраняются автор и лицензия — они выводятся в подписях на сайте.
 */
import fs from "node:fs/promises";
import path from "node:path";

const UA = "VOV-EduSite/1.0 (school history project; contact: teacher@example.org)";
const OUT_DIR = path.resolve("public/images/wiki");
const MANIFEST = path.resolve("src/data/photo-manifest.json");

const PERSONS = [
  ["p-molotov", "Молотов, Вячеслав Михайлович"],
  ["p-ribbentrop", "Риббентроп, Иоахим фон"],
  ["p-kovalev", "Ковалёв, Михаил Прокофьевич"],
  ["p-pritytsky", "Притыцкий, Сергей Осипович"],
  ["p-plisowski", "Плисовский, Константин"],
  ["p-pavlov", "Павлов, Дмитрий Григорьевич"],
  ["p-gavrilov", "Гаврилов, Пётр Михайлович"],
  ["p-fomin", "Фомин, Ефим Моисеевич"],
  ["p-kizhevatov", "Кижеватов, Андрей Митрофанович"],
  ["p-gastello", "Гастелло, Николай Францевич"],
  ["p-russiyanov", "Руссиянов, Иван Никитич"],
  ["p-romanov", "Романов, Михаил Тимофеевич"],
  ["p-kutepov", "Кутепов, Семён Фёдорович"],
  ["p-petrovsky", "Петровский, Леонид Григорьевич"],
  ["p-flerov", "Флёров, Иван Андреевич"],
  ["p-kube", "Кубе, Вильгельм"],
  ["p-gottberg", "Готтберг, Курт фон"],
  ["p-mazanik", "Мазаник, Елена Григорьевна"],
  ["p-osipova", "Осипова, Мария Борисовна"],
  ["p-troyan", "Троян, Надежда Викторовна"],
  ["p-kaminsky", "Каминский, Иосиф Иосифович"],
  ["p-ostrovsky", "Островский, Радослав Казимирович"],
  ["p-korzh", "Корж, Василий Захарович"],
  ["p-bumazhkov", "Бумажков, Тихон Пименович"],
  ["p-pavlovsky", "Павловский, Фёдор Илларионович"],
  ["p-shmyrev", "Шмырёв, Минай Филиппович"],
  ["p-zaslonov", "Заслонов, Константин Сергеевич"],
  ["p-ponomarenko", "Пономаренко, Пантелеймон Кондратьевич"],
  ["p-kalinin", "Калинин, Пётр Захарович"],
  ["p-lobanok", "Лобанок, Владимир Елисеевич"],
  ["p-masherov", "Машеров, Пётр Миронович"],
  ["p-kazey", "Казей, Марат Иванович"],
  ["p-kazinets", "Казинец, Исай Павлович"],
  ["p-kabushkin", "Кабушкин, Иван Константинович"],
  ["p-omelyanyuk", "Омельянюк, Владимир Степанович"],
  ["p-klumov", "Клумов, Евгений Владимирович"],
  ["p-khoruzhaya", "Хоружая, Вера Захаровна"],
  ["p-krylovich", "Крылович, Фёдор Андреевич"],
  ["p-zenkova", "Зенькова, Ефросинья Савельевна"],
  ["p-portnova", "Портнова, Зинаида Мартыновна"],
  ["p-rokossovsky", "Рокоссовский, Константин Константинович"],
  ["p-batov", "Батов, Павел Иванович"],
  ["p-bagramyan", "Баграмян, Иван Христофорович"],
  ["p-gorbatov", "Горбатов, Александр Васильевич"],
  ["p-berling", "Берлинг, Зыгмунт"],
  ["p-chernyakhovsky", "Черняховский, Иван Данилович"],
  ["p-zakharov", "Захаров, Георгий Фёдорович"],
  ["p-zhukov", "Жуков, Георгий Константинович"],
  ["p-vasilevsky", "Василевский, Александр Михайлович"],
  ["p-burdeyny", "Бурдейный, Алексей Семёнович"],
  ["p-frolikov", "Фроликов, Дмитрий Георгиевич"],
  ["p-smirnov", "Смирнов, Юрий Васильевич"],
  ["p-kiselev", "Киселёв, Кузьма Венедиктович"],
  ["p-dovator", "Доватор, Лев Михайлович"],
  ["p-gorovets", "Горовец, Александр Константинович"],
  ["p-yakubovsky", "Якубовский, Иван Игнатьевич"],
  ["p-golovachev", "Головачёв, Павел Яковлевич"],
  ["p-tusnolobova", "Туснолобова-Марченко, Зинаида Михайловна"],
  ["p-smolyachkov", "Смолячков, Феодосий Артемьевич"],
  ["p-kovzan", "Ковзан, Борис Иванович"],
  ["p-lisovets", "Лисовец, Надежда Ивановна"],
];

const EVENTS = [
  ["e-pact-1939", "Договор о ненападении между Германией и Советским Союзом"],
  ["e-narodnoe-sobranie", "Народное собрание Западной Белоруссии"],
  ["e-pohod-1939", "Польский поход Красной армии (1939)"],
  ["e-brest-1941", "Оборона Брестской крепости"],
  ["e-mogilev-1941", "Оборона Могилёва (1941)"],
  ["e-minsk-ghetto", "Минское гетто"],
  ["e-trostenets", "Тростенец (лагерь смерти)"],
  ["e-khatyn", "Хатынь"],
  ["e-ozarichi", "Озаричи (лагерь смерти)"],
  ["e-partisans", "Партизанское движение в Белоруссии во время Великой Отечественной войны"],
  ["e-rail-war", "Рельсовая война"],
  ["e-young-avengers", "Юные мстители"],
  ["e-bagration", "Белорусская операция (1944)"],
  ["e-minsk-1944", "Минская операция"],
  ["e-partisan-parade", "Партизанский парад в Минске"],
  ["e-parade-captives", "Марш пленных немцев по Москве"],
  ["e-lenino", "Бой под Ленино"],
  ["e-gomel-1943", "Гомельско-Речицкая операция"],
  ["e-un-1945", "Конференция в Сан-Франциско"],
  ["e-kurgan", "Курган Славы"],
  ["e-victory-monument", "Монумент Победы (Минск)"],
  ["e-brest-fortress", "Брестская крепость"],
  ["e-museum", "Белорусский государственный музей истории Великой Отечественной войны"],
  ["e-proryv", "Прорыв (мемориальный комплекс)"],
  ["e-stalag-352", "Шталаг 352"],
  ["e-krasny-bereg", "Красный Берег (мемориальный комплекс)"],
  ["e-kube", "Убийство Вильгельма Кубе"],
  ["e-dnieper-1943", "Битва за Днепр"],
  ["e-vitebsk-1944", "Витебско-Оршанская операция"],
  ["e-bobruisk-1944", "Бобруйская операция"],
  ["e-yama", "Яма (мемориал)"],
  ["e-sbm", "Союз белорусской молодёжи"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function pageImage(title, size) {
  const props = { action: "query", redirects: "1", prop: "pageimages", piprop: "original|name|thumbnail", pithumbsize: String(size) };
  let data = await api("https://ru.wikipedia.org/w/api.php", { ...props, titles: title });
  let page = data.query?.pages?.[0];
  if (!page || page.missing || !page.original) {
    data = await api("https://ru.wikipedia.org/w/api.php", { ...props, generator: "search", gsrsearch: title, gsrlimit: "1", gsrnamespace: "0" });
    page = data.query?.pages?.[0];
  }
  if (!page || !page.original) return null;
  return { resolvedTitle: page.title, file: page.pageimage, original: page.original.source, thumb: page.thumbnail?.source };
}

function strip(html = "") {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function commonsMeta(file) {
  const data = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    prop: "imageinfo",
    iiprop: "extmetadata|mime|url",
    iiextmetadatafilter: "Artist|LicenseShortName|ImageDescription|Credit|DateTimeOriginal",
    titles: `File:${file}`,
  });
  const info = data.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  return {
    mime: info.mime,
    artist: strip(m.Artist?.value).slice(0, 120),
    license: strip(m.LicenseShortName?.value),
    description: strip(m.ImageDescription?.value).slice(0, 400),
    credit: strip(m.Credit?.value).slice(0, 120),
    date: strip(m.DateTimeOriginal?.value).slice(0, 40),
  };
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const manifest = {};
  const jobs = [...PERSONS.map(([k, t]) => [k, t, 480]), ...EVENTS.map(([k, t]) => [k, t, 1200])];

  for (const [key, title, size] of jobs) {
    try {
      const img = await pageImage(title, size);
      if (!img) {
        console.log(`✗ ${key}: нет изображения`);
        continue;
      }
      if (!img.original.includes("/wikipedia/commons/")) {
        console.log(`✗ ${key}: несвободный файл (${img.resolvedTitle})`);
        manifest[key] = { title: img.resolvedTitle, nonfree: true };
        continue;
      }
      const meta = await commonsMeta(img.file);
      if (!meta || meta.mime === "image/svg+xml") {
        console.log(`✗ ${key}: svg/нет метаданных`);
        continue;
      }
      const src = img.thumb ?? img.original;
      const ext = /\.png(\?|$)/i.test(src) ? "png" : "jpg";
      const fileName = `${key}.${ext}`;
      const bytes = await download(src, path.join(OUT_DIR, fileName));
      manifest[key] = {
        title: img.resolvedTitle,
        file: img.file,
        src: `/images/wiki/${fileName}`,
        artist: meta.artist,
        license: meta.license,
        description: meta.description,
        date: meta.date,
      };
      console.log(`✓ ${key}: ${img.resolvedTitle} — ${img.file} [${meta.license}] ${Math.round(bytes / 1024)}KB`);
      await sleep(120);
    } catch (e) {
      console.log(`! ${key}: ${e.message}`);
    }
  }
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nГотово: ${Object.values(manifest).filter((m) => m.src).length} файлов, манифест ${MANIFEST}`);
}

main();
