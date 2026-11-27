import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Подключение к PostgreSQL через Drizzle.
 * База данных НЕОБЯЗАТЕЛЬНА: если DATABASE_URL не задан (например, при запуске
 * `npm run dev` из VS Code без Postgres), любое обращение к `db` выбросит ошибку,
 * которую API-маршруты перехватывают и отвечают «сервис недоступен». Сайт при этом
 * продолжает работать: прогресс хранится в браузере, конспекты — локальные.
 */
const databaseUrl = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

type Db = ReturnType<typeof drizzle>;

function createDb(): Db {
  if (!databaseUrl) {
    return new Proxy({} as Db, {
      get() {
        throw new Error("DATABASE_URL не настроен: база данных недоступна");
      },
    });
  }
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return drizzle(pool);
}

export const db = createDb();
