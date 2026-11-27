"use client";

import { useEffect, useState } from "react";
import { markTopic, PROGRESS_EVENT, readProgress, syncFromServer, type TopicProgressEntry } from "@/lib/progress";

/** Кнопка «Отметить тему изученной» + статус прогресса по теме */
export default function MarkStudied({ slug }: { slug: string }) {
  const [entry, setEntry] = useState<TopicProgressEntry | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => setEntry(readProgress()[slug] ?? null);
    refresh();
    setMounted(true);
    void syncFromServer().then(refresh);
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, [slug]);

  if (!mounted) return <div className="skeleton h-11 w-56" aria-hidden="true" />;

  const completed = Boolean(entry?.completed);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={`btn ${completed ? "btn-ghost" : "btn-primary"}`}
        onClick={() => markTopic(slug, { completed: !completed })}
        aria-pressed={completed}
      >
        {completed ? "✓ Тема изучена" : "Отметить тему изученной"}
      </button>
      {entry?.bestTotal ? (
        <span className="chip chip-green">
          Лучший результат викторины: {entry.bestScore}/{entry.bestTotal}
        </span>
      ) : (
        <span className="text-xs text-muted">Пройдите викторину — тема отметится автоматически.</span>
      )}
    </div>
  );
}
