"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TopicSummary } from "@/data/types";
import SmartImage from "./SmartImage";
import { PROGRESS_EVENT, readProgress, resetProgress, syncFromServer, type ProgressMap } from "@/lib/progress";

interface HubGridProps {
  topics: TopicSummary[];
  tags: string[];
}

/** Сетка тем хаба: поиск, фильтр по тегам, прогресс изучения (localStorage + сервер) */
export default function HubGrid({ topics, tags }: HubGridProps) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    refresh();
    setMounted(true);
    void syncFromServer().then(setProgress);
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter((t) => {
      const matchesTag = tag ? t.tags.includes(tag) : true;
      if (!matchesTag) return false;
      if (!q) return true;
      const hay = [t.title, t.shortTitle, t.annotation, t.period, t.paragraph, ...t.tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [topics, query, tag]);

  const completedCount = topics.filter((t) => progress[t.slug]?.completed).length;
  const percent = Math.round((completedCount / topics.length) * 100);

  return (
    <div id="topics" className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container-x">
        {/* Прогресс */}
        <div className="card p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Ваш прогресс</p>
              <h2 className="mt-2 text-xl font-bold ff-serif">
                Изучено тем: <span data-hub-count="">{mounted ? completedCount : "…"}</span> из {topics.length}
              </h2>
              <p className="mt-1 text-sm text-muted">Тема считается изученной после прохождения викторины или по вашей отметке. Прогресс сохраняется в браузере.</p>
            </div>
            <div className="flex items-center gap-3" data-hub-actions="">
              <span className="ff-serif text-3xl font-bold text-green" data-hub-percent="">{mounted ? percent : 0}%</span>
              {mounted && completedCount > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => resetProgress()}>
                  Сбросить
                </button>
              )}
            </div>
          </div>
          <div className="progress-track mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={topics.length} aria-valuenow={completedCount} aria-label="Прогресс изучения тем">
            <div className="progress-fill" style={{ width: `${mounted ? percent : 0}%` }} />
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative w-full lg:max-w-sm lg:shrink-0">
            <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              className="input"
              placeholder="Поиск по темам: Багратион, Хатынь, 1939…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по темам"
            />
          </div>
          <div className="chips-scroll" role="group" aria-label="Фильтр по тегам">
            <button type="button" className={`chip chip-outline ${tag === null ? "is-active" : ""}`} onClick={() => setTag(null)}>
              Все темы
            </button>
            {tags.map((t) => (
              <button key={t} type="button" className={`chip chip-outline ${tag === t ? "is-active" : ""}`} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Сетка карточек */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-line p-10 text-center text-muted">
            По запросу «{query}» ничего не найдено. Попробуйте другое слово или снимите фильтр.
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Список тем">
            {filtered.map((t) => {
              const entry = progress[t.slug];
              return (
                <li key={t.slug}>
                  <article className="card topic-card h-full">
                    <Link href={`/topics/${t.slug}`} className="topic-card__cover relative block aspect-[16/10] overflow-hidden" aria-label={`Открыть тему: ${t.title}`}>
                      <SmartImage src={t.cover} fallbacks={t.coverFallbacks} alt="" className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold" style={{ background: "var(--wine)", color: "#fff" }}>
                        {t.number}
                      </span>
                      {entry?.completed && (
                        <span className="absolute right-3 top-3 chip chip-green shadow">✓ Изучено</span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
                      <span className="absolute bottom-3 left-3 text-xs font-bold text-white/95">{t.period}</span>
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">{t.paragraph}</p>
                      <h3 className="mt-1.5 text-lg font-bold ff-serif leading-snug text-ink">
                        <Link href={`/topics/${t.slug}`} className="hover:text-wine transition-colors">
                          {t.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm text-soft leading-relaxed flex-1">{t.annotation}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.tags.map((tg) => (
                          <span key={tg} className="chip chip-xs">
                            {tg}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
                        <span className="text-xs text-muted" data-hub-quiz="">
                          {entry?.bestTotal ? `Викторина: ${entry.bestScore}/${entry.bestTotal}` : `Викторина: ${t.quizCount} вопросов`}
                        </span>
                        <Link href={`/topics/${t.slug}`} className="btn btn-primary btn-sm">
                          Открыть тему →
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
