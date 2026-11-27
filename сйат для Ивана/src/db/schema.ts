import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Результаты прохождения викторин по темам.
 * Используются для общей статистики («средний результат класса»).
 */
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  topicSlug: varchar("topic_slug", { length: 120 }).notNull(),
  visitorId: varchar("visitor_id", { length: 64 }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Прогресс изучения тем. Основное хранилище — localStorage в браузере,
 * таблица нужна для синхронизации между устройствами по анонимному visitorId.
 */
export const topicProgress = pgTable(
  "topic_progress",
  {
    id: serial("id").primaryKey(),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    topicSlug: varchar("topic_slug", { length: 120 }).notNull(),
    completed: boolean("completed").default(false).notNull(),
    bestScore: integer("best_score"),
    bestTotal: integer("best_total"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("topic_progress_visitor_topic_idx").on(t.visitorId, t.topicSlug)],
);

/**
 * Кэш конспектов, сгенерированных ИИ. Позволяет не тратить токены повторно
 * и показывать результат мгновенно.
 */
export const aiSummaries = pgTable("ai_summaries", {
  id: serial("id").primaryKey(),
  topicSlug: varchar("topic_slug", { length: 120 }).notNull(),
  mode: varchar("mode", { length: 16 }).notNull(), // short | medium | full
  source: varchar("source", { length: 16 }).notNull(), // openai | local
  model: varchar("model", { length: 64 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
