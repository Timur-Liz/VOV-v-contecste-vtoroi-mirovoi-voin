import manifestJson from "./photo-manifest.json";
import type { GalleryItem, Topic } from "./types";

/**
 * Реальные фотографии и портреты с Wikimedia Commons.
 * Файлы скачаны скриптом scripts/fetch-wiki-photos*.mjs (только свободные лицензии),
 * метаданные (автор, лицензия) — в photo-manifest.json.
 */

interface ManifestEntry {
  title?: string;
  file?: string;
  src?: string;
  artist?: string;
  license?: string;
  description?: string;
}

const manifest = manifestJson as Record<string, ManifestEntry>;

function cleanArtist(raw?: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Commons иногда дублирует строку автора («Unknown authorUnknown author»)
  const half = s.length / 2;
  if (s.length % 2 === 0 && s.slice(0, half) === s.slice(half)) s = s.slice(0, half);
  s = s.replace(/^Template:/, "").replace(/\s*\(talk\)/g, "").trim();
  if (/unknown|невядом|неизвест|anonymous/i.test(s)) return "автор неизвестен";
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

export function photoSrc(key: string): string | undefined {
  return manifest[key]?.src;
}

/**
 * Адрес того же файла на Wikimedia Commons — запасной источник на случай,
 * если локальный файл из public/images/wiki отсутствует.
 */
export function photoRemote(key: string, width = 960): string | undefined {
  const file = manifest[key]?.file;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}` : undefined;
}

/** Локальный файл + его оригинал на Commons */
function withRemote(key: string, width: number): string[] {
  return [photoSrc(key), photoRemote(key, width)].filter((v): v is string => Boolean(v));
}

/**
 * Запасные обложки тем: если художественная иллюстрация недоступна,
 * показывается реальная фотография по теме.
 */
const COVER_FALLBACK: Record<string, string> = {
  "nachalo-vtoroy-mirovoy-vossoedinenie": "e-narodnoe-sobranie",
  "nachalo-velikoy-otechestvennoy-voyny": "e-brest-fortress",
  "okkupatsionnyy-rezhim": "e-khatyn",
  "partizanskoe-dvizhenie": "e-partisans",
  "podpolnaya-borba": "e-yama",
  "nachalo-osvobozhdeniya": "e-dnieper-1943",
  "operatsiya-bagration": "e-bagration",
  "vklad-v-pobedu-i-oon": "e-victory-monument",
};

/** Запасные изображения для главного экрана хаба */
export const HUB_HERO_FALLBACKS: string[] = [...withRemote("e-kurgan", 1600), ...withRemote("e-victory-monument", 1600)];

export function photoCredit(key: string): string {
  const e = manifest[key];
  if (!e) return "";
  const parts = [cleanArtist(e.artist), e.license].filter(Boolean);
  return `Wikimedia Commons${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

/** Имя персоны (как в данных темы) → ключ фото */
const PERSON_PHOTOS: Record<string, { key: string; note?: string }> = {
  "Вячеслав Михайлович Молотов": { key: "p-molotov" },
  "Иоахим фон Риббентроп": { key: "p-ribbentrop" },
  "Сергей Осипович Притыцкий": { key: "p-pritytsky" },
  "Константин Плисовский": { key: "p-plisowski" },
  "Дмитрий Григорьевич Павлов": { key: "p-pavlov" },
  "Пётр Михайлович Гаврилов": { key: "p-gavrilov" },
  "Ефим Моисеевич Фомин": { key: "p-fomin" },
  "Андрей Митрофанович Кижеватов": { key: "p-kizhevatov", note: "Портрет на почтовой марке Беларуси, 2016 г." },
  "Николай Францевич Гастелло": { key: "p-gastello" },
  "Вильгельм Кубе": { key: "p-kube" },
  "Мария Борисовна Осипова": { key: "p-osipova" },
  "Надежда Викторовна Троян": { key: "p-troyan" },
  "Радослав Островский": { key: "p-ostrovsky" },
  "Василий Захарович Корж": { key: "p-korzh" },
  "Тихон Пименович Бумажков": { key: "p-bumazhkov" },
  "Минай Филиппович Шмырёв (батька Минай)": { key: "p-shmyrev", note: "Портрет на почтовой марке СССР, 1967 г." },
  "Пантелеймон Кондратьевич Пономаренко": { key: "p-ponomarenko" },
  "Пётр Миронович Машеров": { key: "p-masherov", note: "По почтовой марке Беларуси, 1998 г." },
  "Владимир Степанович Омельянюк": { key: "p-omelyanyuk" },
  "Евгений Владимирович Клумов": { key: "p-klumov", note: "Портрет на почтовой марке Беларуси, 2001 г." },
  "Вера Захаровна Хоружая": { key: "p-khoruzhaya" },
  "Зинаида Мартыновна Портнова": { key: "p-portnova", note: "Портрет на почтовом конверте, 1978 г." },
  "Константин Константинович Рокоссовский": { key: "p-rokossovsky" },
  "Павел Иванович Батов": { key: "p-batov" },
  "Иван Христофорович Баграмян": { key: "p-bagramyan" },
  "Александр Васильевич Горбатов": { key: "p-gorbatov" },
  "Зыгмунт Берлинг": { key: "p-berling" },
  "Иван Данилович Черняховский": { key: "p-chernyakhovsky" },
  "Георгий Фёдорович Захаров": { key: "p-zakharov" },
  "Георгий Константинович Жуков": { key: "p-zhukov" },
  "Александр Михайлович Василевский": { key: "p-vasilevsky" },
  "Лев Михайлович Доватор": { key: "p-dovator" },
  "Иван Игнатьевич Якубовский": { key: "p-yakubovsky" },
  "Зинаида Михайловна Туснолобова-Марченко": { key: "p-tusnolobova" },
  "Борис Иванович Ковзан": { key: "p-kovzan", note: "Портрет на почтовой марке России, 2014 г." },
};

interface WikiPhoto {
  key: string;
  caption: string;
  alt: string;
}

/** Реальные фотографии для галерей тем (slug темы → список) */
const TOPIC_PHOTOS: Record<string, WikiPhoto[]> = {
  "nachalo-vtoroy-mirovoy-vossoedinenie": [
    {
      key: "e-pact-1939",
      caption: "Москва, 23 августа 1939 г.: И. В. Сталин и И. фон Риббентроп после подписания Договора о ненападении между СССР и Германией. Фото: Bundesarchiv.",
      alt: "Сталин и Риббентроп пожимают руки после подписания договора о ненападении, Москва, 1939 год",
    },
    {
      key: "e-narodnoe-sobranie",
      caption: "Народное собрание Западной Беларуси. Белосток, 28–30 октября 1939 г.",
      alt: "Зал заседаний Народного собрания Западной Беларуси в Белостоке, 1939 год",
    },
  ],
  "nachalo-velikoy-otechestvennoy-voyny": [
    {
      key: "e-brest-fortress",
      caption: "Холмские ворота Брестской крепости — один из центров обороны в июне 1941 г. Современный вид.",
      alt: "Холмские ворота Брестской крепости из красного кирпича",
    },
    {
      key: "e-mogilev-1941",
      caption: "Мемориальный комплекс «Буйничское поле» под Могилёвом — на месте боя 12 июля 1941 г.",
      alt: "Барельеф мемориального комплекса на Буйничском поле",
    },
  ],
  "okkupatsionnyy-rezhim": [
    {
      key: "e-khatyn",
      caption: "Мемориальный комплекс «Хатынь». Скульптура «Непокорённый человек»: Иосиф Каминский с погибшим сыном на руках.",
      alt: "Бронзовая скульптура Непокорённый человек в мемориальном комплексе Хатынь",
    },
    {
      key: "e-trostenets",
      caption: "Мемориальный комплекс «Тростенец» на месте крупнейшего лагеря смерти на оккупированной территории СССР. Композиция «Врата памяти».",
      alt: "Скульптурная композиция Врата памяти в мемориале Тростенец",
    },
    {
      key: "e-ozarichi",
      caption: "Мемориал на месте Озаричских лагерей смерти (Калинковичский район), март 1944 г.",
      alt: "Мемориал жертвам Озаричских лагерей смерти",
    },
    {
      key: "e-krasny-bereg",
      caption: "Мемориал «Детям — жертвам войны» в Красном Береге, на месте детского донорского лагеря.",
      alt: "Скульптура девочки в мемориале Красный Берег",
    },
    {
      key: "e-stalag-352",
      caption: "Мемориал на месте лагеря советских военнопленных Шталаг 352 в Масюковщине (Минск).",
      alt: "Мемориал на месте лагеря военнопленных в Масюковщине",
    },
    {
      key: "e-yama",
      caption: "Мемориал «Яма» в Минске — на месте массового расстрела узников Минского гетто 2 марта 1942 г. Обелиск установлен в 1947 г.",
      alt: "Мемориал Яма в Минске",
    },
    {
      key: "e-minsk-ghetto",
      caption: "План Минского гетто — одного из крупнейших в Европе (более 100 тыс. узников).",
      alt: "Схематический план территории Минского гетто",
    },
  ],
  "partizanskoe-dvizhenie": [
    {
      key: "e-partisans",
      caption: "Партизаны в лесу. Фотография военных лет из собрания Wikimedia Commons.",
      alt: "Двое партизан с винтовками в лесу",
    },
    {
      key: "e-proryv",
      caption: "Мемориальный комплекс «Прорыв» у деревни Паперино (Ушачский район) — на месте прорыва блокады партизанами Полоцко-Лепельской зоны в ночь на 5 мая 1944 г.",
      alt: "Мемориальный комплекс Прорыв с боевой техникой",
    },
  ],
  "podpolnaya-borba": [
    {
      key: "e-yama",
      caption: "Мемориал «Яма» в Минске. Подпольщики города помогали узникам гетто бежать к партизанам.",
      alt: "Мемориал Яма в Минске",
    },
    {
      key: "e-partisans",
      caption: "Партизаны в лесу. Подпольщики городов переправляли к партизанам людей, оружие и медикаменты.",
      alt: "Двое партизан с винтовками в лесу",
    },
  ],
  "nachalo-osvobozhdeniya": [
    {
      key: "e-dnieper-1943",
      caption: "Переправа частей Красной Армии через Днепр, осень 1943 г.",
      alt: "Советские солдаты переправляются через реку на плотах",
    },
    {
      key: "e-gomel-1943",
      caption: "Танк Т-34-76 — памятник воинам-освободителям в Речице, освобождённой 18 ноября 1943 г.",
      alt: "Танк Т-34 на постаменте в Речице",
    },
  ],
  "operatsiya-bagration": [
    {
      key: "e-bagration",
      caption: "Разгромленная немецкая техника на дороге в Беларуси, июль 1944 г.",
      alt: "Поле с брошенной и разбитой немецкой техникой, Беларусь, 1944 год",
    },
    {
      key: "e-bobruisk-1944",
      caption: "Подбитый немецкий танк Pz.IV под Бобруйском, 28 июня 1944 г.",
      alt: "Советский солдат на подбитом немецком танке под Бобруйском",
    },
    {
      key: "e-parade-captives",
      caption: "«Парад побеждённых»: колонны немецких военнопленных на улицах Москвы, 17 июля 1944 г. Фото: Михаил Трахман.",
      alt: "Колонны немецких военнопленных на улице Москвы",
    },
    {
      key: "e-vitebsk-1944",
      caption: "Схема Витебско-Оршанской операции, 23–28 июня 1944 г.",
      alt: "Карта-схема Витебско-Оршанской операции",
    },
    {
      key: "e-minsk-1944",
      caption: "Схема Минской операции: окружение группировки противника восточнее Минска, 29 июня — 4 июля 1944 г.",
      alt: "Карта-схема Минской наступательной операции",
    },
  ],
  "vklad-v-pobedu-i-oon": [
    {
      key: "e-kurgan",
      caption: "Курган Славы под Минском (1969) — памятник воинам четырёх фронтов, освобождавших Беларусь.",
      alt: "Курган Славы с обелиском из четырёх штыков",
    },
    {
      key: "e-museum",
      caption: "Белорусский государственный музей истории Великой Отечественной войны (здание 2014 г.) и обелиск «Минск — город-герой».",
      alt: "Здание музея истории Великой Отечественной войны и обелиск Минск — город-герой",
    },
    {
      key: "e-victory-monument",
      caption: "Площадь Победы в Минске. Монумент Победы открыт 3 июля 1954 г.",
      alt: "Монумент Победы на площади Победы в Минске",
    },
  ],
};

/** Добавляет к теме реальные портреты персон и фотографии в галерею */
export function enrichTopic(topic: Topic): Topic {
  const persons = topic.persons.map((p) => {
    const m = PERSON_PHOTOS[p.name];
    if (!m) return p;
    const src = photoSrc(m.key);
    const remote = photoRemote(m.key, 480);
    return src ? { ...p, photo: { src, credit: photoCredit(m.key), note: m.note, fallbacks: remote ? [remote] : [] } } : p;
  });

  const real: GalleryItem[] = (TOPIC_PHOTOS[topic.slug] ?? []).flatMap(({ key, caption, alt }) => {
    const src = photoSrc(key);
    const remote = photoRemote(key, 1200);
    return src ? [{ type: "image" as const, src, fallbacks: remote ? [remote] : [], alt, caption, source: photoCredit(key) }] : [];
  });

  const coverKey = COVER_FALLBACK[topic.slug];
  const coverFallbacks = coverKey ? withRemote(coverKey, 1600) : [];

  return { ...topic, coverFallbacks, persons, gallery: [...real, ...topic.gallery] };
}
