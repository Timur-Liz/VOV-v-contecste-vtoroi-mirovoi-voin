/**
 * Пути к статике (картинки, GeoJSON) и API.
 *
 * Главная идея — ОТНОСИТЕЛЬНЫЕ пути: «./images/…» на главной и «../../images/…»
 * на странице темы. Они работают одинаково:
 *   • на http://localhost:3000 (npm run dev / npm start);
 *   • в Live Server и `npm run preview:static`;
 *   • на GitHub Pages в любой подпапке (https://user.github.io/<репозиторий>/),
 *     даже если подпапка при сборке указана неверно или не указана вовсе.
 *
 * Абсолютные пути с префиксом используются только в серверном режиме с явно
 * заданным NEXT_PUBLIC_BASE_PATH (там нет завершающего «/» в адресах страниц).
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** true — сайт собран как статический (`npm run build:static`), сервера и API нет */
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** Доступны ли серверные маршруты /api/* */
export const API_ENABLED = !IS_STATIC_EXPORT;

const USE_ABSOLUTE = BASE_PATH !== "" && !IS_STATIC_EXPORT;

export function isExternal(path: string): boolean {
  return /^(https?:)?\/\//.test(path) || path.startsWith("data:");
}

/**
 * Путь к файлу из public/.
 * @param path  «/images/…» (как в данных тем) или внешний URL — он возвращается как есть
 * @param depth глубина страницы: 0 — главная, 2 — /topics/<slug>/
 */
export function asset(path: string, depth = 0): string {
  if (isExternal(path)) return path;
  const clean = path.replace(/^\/+/, "");
  if (USE_ABSOLUTE) return `${BASE_PATH}/${clean}`;
  return `${depth <= 0 ? "./" : "../".repeat(depth)}${clean}`;
}

/** Абсолютный путь (для метаданных Open Graph — их разрешает metadataBase) */
export function absoluteAsset(path: string): string {
  return isExternal(path) ? path : `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Путь к API-маршруту (только серверный режим) */
export function api(path: string): string {
  return `${BASE_PATH}${path}`;
}
