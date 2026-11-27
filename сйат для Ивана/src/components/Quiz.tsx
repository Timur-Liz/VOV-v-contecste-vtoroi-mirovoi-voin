"use client";

import { useEffect, useState } from "react";
import type { QuizQuestion } from "@/data/types";
import { api, API_ENABLED } from "@/lib/paths";
import { getVisitorId, markTopic } from "@/lib/progress";

interface QuizStats {
  attempts: number;
  avgPercent: number | null;
  bestPercent: number | null;
}

interface QuizProps {
  slug: string;
  questions: QuizQuestion[];
}

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

function resultMessage(percent: number) {
  if (percent === 100) return { title: "Блестяще!", text: "Вы ответили правильно на все вопросы. Тема усвоена отлично." };
  if (percent >= 75) return { title: "Отличный результат", text: "Вы хорошо знаете тему. Просмотрите разбор ошибок, чтобы закрепить материал." };
  if (percent >= 50) return { title: "Неплохо", text: "Основное вы усвоили, но стоит перечитать конспект и пройти викторину ещё раз." };
  return { title: "Стоит повторить", text: "Вернитесь к обзору темы и хронологии — и попробуйте снова." };
}

/** Викторина: вопросы по одному, мгновенная проверка, объяснения, подсчёт баллов, сохранение результата */
export default function Quiz({ slug, questions }: QuizProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [saving, setSaving] = useState(false);

  const total = questions.length;
  const score = answers.reduce<number>((acc, a, i) => (a === questions[i].correct ? acc + 1 : acc), 0);
  const current = questions[index];

  useEffect(() => {
    if (!API_ENABLED) return;
    fetch(api(`/api/quiz?slug=${encodeURIComponent(slug)}`), { headers: { Accept: "application/json" } })
      .then((r) => (r.ok && (r.headers.get("content-type") ?? "").includes("json") ? r.json() : null))
      .then((d: QuizStats | null) => d && setStats(d))
      .catch(() => undefined);
  }, [slug]);

  const choose = (optIndex: number) => {
    if (selected !== null) return;
    setSelected(optIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optIndex;
      return next;
    });
  };

  const next = async () => {
    if (index < total - 1) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    // Завершение
    const finalScore = answers.reduce<number>((acc, a, i) => (a === questions[i].correct ? acc + 1 : acc), 0);
    setFinished(true);
    markTopic(slug, { completed: true, score: finalScore, total });
    if (!API_ENABLED) return; // статическая версия: результат сохранён в браузере
    setSaving(true);
    try {
      const res = await fetch(api("/api/quiz"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: slug, score: finalScore, total, visitorId: getVisitorId() }),
      });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) setStats((await res.json()) as QuizStats);
    } catch {
      /* офлайн — результат сохранён локально */
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setAnswers(questions.map(() => null));
    setFinished(false);
  };

  const percent = Math.round((score / total) * 100);

  if (finished) {
    const msg = resultMessage(percent);
    return (
      <div className="card p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div
            className="mx-auto grid h-32 w-32 place-items-center rounded-full ff-serif text-3xl font-bold"
            style={{
              background: `conic-gradient(var(--green-2) ${percent}%, var(--bg-soft) 0)`,
              color: "var(--ink)",
            }}
            role="img"
            aria-label={`Результат: ${percent} процентов`}
          >
            <span className="grid h-24 w-24 place-items-center rounded-full bg-elev">{percent}%</span>
          </div>
          <div>
            <p className="eyebrow">Результат</p>
            <h3 className="mt-2 text-2xl font-bold ff-serif">{msg.title}</h3>
            <p className="mt-1 text-soft">
              Правильных ответов: <strong className="text-ink">{score}</strong> из {total}. {msg.text}
            </p>
            {stats && stats.attempts > 0 && (
              <p className="mt-3 text-sm text-muted">
                Эту викторину проходили {stats.attempts} раз(а); средний результат — {stats.avgPercent ?? 0}%, лучший — {stats.bestPercent ?? 0}%.
                {saving && " Сохраняем…"}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={restart}>
                Пройти ещё раз
              </button>
              <a href="#summary" className="btn btn-ghost">
                Повторить конспект
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted">Разбор ответов</h4>
          <ol className="mt-4 space-y-4">
            {questions.map((q, i) => {
              const ok = answers[i] === q.correct;
              return (
                <li key={i} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className={`chip ${ok ? "chip-green" : "chip-wine"} shrink-0`}>{ok ? "Верно" : "Ошибка"}</span>
                    <div>
                      <p className="font-semibold">
                        {i + 1}. {q.question}
                      </p>
                      {!ok && answers[i] !== null && <p className="mt-1 text-sm text-wine">Ваш ответ: {q.options[answers[i] as number]}</p>}
                      <p className="mt-1 text-sm text-green font-semibold">Правильно: {q.options[q.correct]}</p>
                      <p className="mt-1 text-sm text-soft">{q.explanation}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold text-muted">
          Вопрос {index + 1} из {total}
        </span>
        <span className="chip chip-green">Баллы: {score}</span>
      </div>
      <div className="progress-track mt-3" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${((index + (selected !== null ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <h3 className="mt-6 text-xl font-bold ff-serif leading-snug">{current.question}</h3>

      <div className="mt-5 grid gap-2.5" role="group" aria-label="Варианты ответа">
        {current.options.map((opt, i) => {
          let cls = "quiz-option";
          if (selected !== null) {
            if (i === current.correct) cls += " is-correct";
            else if (i === selected) cls += " is-wrong";
          }
          return (
            <button key={i} type="button" className={cls} disabled={selected !== null} onClick={() => choose(i)}>
              <span className="opt-letter">{LETTERS[i]}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-5 rounded-2xl p-4" style={{ background: selected === current.correct ? "var(--green-tint)" : "var(--wine-tint)" }} role="status">
          <p className="font-bold">{selected === current.correct ? "Верно!" : "Неверно."}</p>
          <p className="mt-1 text-sm text-soft">{current.explanation}</p>
          <button type="button" className="btn btn-primary mt-4" onClick={next}>
            {index < total - 1 ? "Следующий вопрос →" : "Показать результат"}
          </button>
        </div>
      )}

      {stats && stats.attempts > 0 && selected === null && (
        <p className="mt-5 text-xs text-muted">
          Викторину уже проходили {stats.attempts} раз(а), средний результат — {stats.avgPercent ?? 0}%.
        </p>
      )}
    </div>
  );
}
