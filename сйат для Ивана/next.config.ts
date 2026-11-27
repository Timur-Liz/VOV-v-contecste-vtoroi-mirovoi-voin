import type { NextConfig } from "next";

/**
 * Два режима сборки:
 *  - обычный (`npm run build`): полноценный Next.js-сервер с API и PostgreSQL;
 *  - статический (`npm run build:static`, STATIC_EXPORT=1): папка out/ для GitHub Pages,
 *    Live Server в VS Code и любого статического хостинга.
 *
 * NEXT_PUBLIC_BASE_PATH — подпапка, если сайт лежит не в корне домена
 * (например, «/Bagration_sait_» для https://user.github.io/Bagration_sait_/).
 * В GitHub Actions она вычисляется автоматически из имени репозитория.
 * Картинки и GeoJSON от неё не зависят — они подключаются относительными путями.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export", trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
  images: { unoptimized: true },
  // Сообщаем клиентскому коду, что сервера и API нет (см. src/lib/paths.ts)
  env: { NEXT_PUBLIC_STATIC_EXPORT: isStaticExport ? "1" : "0" },
};

export default nextConfig;
