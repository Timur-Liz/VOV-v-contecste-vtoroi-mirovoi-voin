"use client";

import { useEffect, useRef, useState } from "react";
import type { Topic } from "@/data/types";
import { api, API_ENABLED } from "@/lib/paths";

type Mode = "short" | "medium" | "full";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "short", label: "Кратко", hint: "4–5 тезисов" },
  { id: "medium", label: "Средне", hint: "7–9 тезисов" },
  { id: "full", label: "Подробно", hint: "12–15 тезисов" },
];

interface SummaryResult {
  bullets: string[];
  source: "openai" | "local";
  model?: string;
  cached?: boolean;
  note?: string;
}

interface AiSummaryProps {
  slug: string;
  title: string;
  local: Topic["summary"];
}

/**
 * Блок «Конспект через ИИ».
 * Вариант А: запрос к /api/summary → OpenAI (если настроен OPENAI_API_KEY).
 * Вариант Б: если API недоступен, сервер возвращает заранее подготовленный конспект.
 */
export default function AiSummary({ slug, title, local }: AiSummaryProps) {
  const [mode, setMode] = useState<Mode>("medium");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [visible, setVisible] = useState(0);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Постепенное «печатание» тезисов
  useEffect(() => {
    if (!result) return;
    setVisible(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setVisible(i);
      if (i < result.bullets.length) timerRef.current = window.setTimeout(tick, 140);
    };
    timerRef.current = window.setTimeout(tick, 120);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [result]);

  const generate = async (nextMode: Mode = mode, forceLocal = false) => {
    setMode(nextMode);
    setStatus("loading");
    setCopied(false);
    // Статическая версия сайта (GitHub Pages): сервера нет — сразу показываем подготовленный конспект
    if (!API_ENABLED) {
      window.setTimeout(() => {
        setResult({
          bullets: local[nextMode],
          source: "local",
          note: forceLocal ? undefined : "В статической версии сайта ИИ-сервер не подключён — показан подготовленный конспект темы.",
        });
        setStatus("done");
      }, 450);
      return;
    }
    try {
      const res = await fetch(api("/api/summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ slug, mode: nextMode, forceLocal }),
      });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error("bad response");
      const data = (await res.json()) as SummaryResult;
      setResult(data);
      setStatus("done");
    } catch {
      // Сервер недоступен — используем встроенный конспект
      setResult({
        bullets: local[nextMode],
        source: "local",
        note: forceLocal ? undefined : "ИИ-сервер недоступен (статическая версия сайта) — показан подготовленный конспект темы.",
      });
      setStatus("done");
    }
  };

  const copy = async () => {
    if (!result) return;
    const text = `${title}\n\n${result.bullets.map((b) => `• ${b}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const modeIndex = MODES.findIndex((m) => m.id === mode);

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--gold-tint)", color: "var(--gold)" }} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8L12 3zM19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1-2.1-.9 2.1-.9L19 15zM5 14l.7 1.6 1.6.7-1.6.7L5 18.6l-.7-1.6-1.6-.7 1.6-.7L5 14z" />
              </svg>
            </span>
            <h3 className="text-lg font-bold ff-serif">Конспект темы</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            Выберите объём и нажмите «Сгенерировать». Если ИИ-сервис не настроен, будет показан подготовленный конспект.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Объём конспекта">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className={`chip chip-outline ${mode === m.id ? "is-active" : ""}`}
              onClick={() => (status === "done" ? generate(m.id) : setMode(m.id))}
              title={m.hint}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => generate()} disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Генерируем…
            </>
          ) : status === "done" ? (
            "Сгенерировать заново"
          ) : (
            "Сгенерировать конспект"
          )}
        </button>
        {status === "done" && (
          <>
            <button type="button" className="btn btn-ghost" disabled={modeIndex === 0 || status !== "done"} onClick={() => generate(MODES[modeIndex - 1].id)}>
              − Сократить
            </button>
            <button type="button" className="btn btn-ghost" disabled={modeIndex === MODES.length - 1} onClick={() => generate(MODES[modeIndex + 1].id)}>
              + Расширить
            </button>
            <button type="button" className="btn btn-ghost" onClick={copy}>
              {copied ? "Скопировано ✓" : "Скопировать"}
            </button>
          </>
        )}
        {status !== "loading" && (
          <button type="button" className="btn btn-ghost btn-sm self-center text-muted" onClick={() => generate(mode, true)}>
            Показать локальный конспект
          </button>
        )}
      </div>

      <div className="mt-6 min-h-[120px]" aria-live="polite">
        {status === "idle" && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Здесь появится конспект темы «{title}» — {MODES[modeIndex].hint}.
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-3" aria-label="Загрузка">
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-10/12" />
            <div className="skeleton h-4 w-9/12" />
          </div>
        )}

        {status === "done" && result && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {result.source === "openai" ? (
                <span className="chip chip-green">Сгенерировано ИИ{result.model ? ` · ${result.model}` : ""}{result.cached ? " · из кэша" : ""}</span>
              ) : (
                <span className="chip">Локальный конспект</span>
              )}
              <span className="chip chip-outline" style={{ cursor: "default" }}>
                {MODES[modeIndex].label}
              </span>
              {result.note && <span className="text-xs text-muted">{result.note}</span>}
            </div>
            <ul className="summary-list space-y-2.5">
              {result.bullets.slice(0, visible).map((b, i) => (
                <li key={i} style={{ animationDelay: `${Math.min(i, 3) * 40}ms` }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
