"use client";

/**
 * Прогресс изучения тем.
 * Источник истины — localStorage (работает без сервера).
 * Дополнительно результаты отправляются на сервер (/api/progress) по анонимному
 * идентификатору посетителя, чтобы прогресс можно было восстановить.
 */

import { api, API_ENABLED } from "./paths";

export interface TopicProgressEntry {
  completed: boolean;
  bestScore?: number;
  bestTotal?: number;
  updatedAt: string;
}

export type ProgressMap = Record<string, TopicProgressEntry>;

const PROGRESS_KEY = "vov_progress_v1";
const VISITOR_KEY = "vov_visitor_id";
export const PROGRESS_EVENT = "vov:progress";

function hasWindow() {
  return typeof window !== "undefined";
}

export function getVisitorId(): string {
  if (!hasWindow()) return "server";
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function readProgress(): ProgressMap {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function writeProgress(map: ProgressMap) {
  if (!hasWindow()) return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

/** Отметить тему (изучена / результат викторины) и синхронизировать с сервером */
export function markTopic(
  slug: string,
  patch: { completed?: boolean; score?: number; total?: number },
): ProgressMap {
  const map = readProgress();
  const prev = map[slug] ?? { completed: false, updatedAt: new Date().toISOString() };
  const next: TopicProgressEntry = { ...prev, updatedAt: new Date().toISOString() };

  if (patch.completed !== undefined) next.completed = patch.completed;

  if (patch.score !== undefined && patch.total) {
    const prevPct = prev.bestTotal ? (prev.bestScore ?? 0) / prev.bestTotal : -1;
    const newPct = patch.score / patch.total;
    if (newPct > prevPct) {
      next.bestScore = patch.score;
      next.bestTotal = patch.total;
    }
  }

  map[slug] = next;
  writeProgress(map);

  // В статической версии сайта сервера нет — прогресс живёт только в браузере
  if (!API_ENABLED) return map;

  // Синхронизация с сервером — без блокировки интерфейса
  void fetch(api("/api/progress"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      topicSlug: slug,
      completed: next.completed,
      bestScore: next.bestScore ?? null,
      bestTotal: next.bestTotal ?? null,
    }),
  }).catch(() => undefined);

  return map;
}

export function resetProgress() {
  writeProgress({});
}

/** Подтянуть прогресс с сервера и объединить с локальным */
export async function syncFromServer(): Promise<ProgressMap> {
  const local = readProgress();
  if (!hasWindow() || !API_ENABLED) return local;
  try {
    const res = await fetch(api(`/api/progress?visitorId=${encodeURIComponent(getVisitorId())}`), { headers: { Accept: "application/json" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return local;
    const data = (await res.json()) as {
      items: { topicSlug: string; completed: boolean; bestScore: number | null; bestTotal: number | null; updatedAt: string }[];
    };
    let changed = false;
    for (const item of data.items) {
      const cur = local[item.topicSlug];
      const serverPct = item.bestTotal ? (item.bestScore ?? 0) / item.bestTotal : -1;
      const localPct = cur?.bestTotal ? (cur.bestScore ?? 0) / cur.bestTotal : -1;
      if (!cur || (item.completed && !cur.completed) || serverPct > localPct) {
        local[item.topicSlug] = {
          completed: Boolean(cur?.completed || item.completed),
          bestScore: serverPct > localPct ? (item.bestScore ?? undefined) : cur?.bestScore,
          bestTotal: serverPct > localPct ? (item.bestTotal ?? undefined) : cur?.bestTotal,
          updatedAt: item.updatedAt,
        };
        changed = true;
      }
    }
    if (changed) writeProgress(local);
  } catch {
    /* сервер недоступен — работаем только с localStorage */
  }
  return local;
}
