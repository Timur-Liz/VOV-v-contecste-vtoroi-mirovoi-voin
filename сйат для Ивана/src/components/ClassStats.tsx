"use client";

import { useEffect, useState } from "react";
import { api, API_ENABLED } from "@/lib/paths";

interface Stats {
  attempts: number;
  avgPercent: number | null;
}

interface ClassStatsProps {
  totals: { persons: number; points: number; questions: number };
}

/**
 * Общая статистика викторин (из PostgreSQL через /api/quiz).
 * В статической версии сайта (GitHub Pages) или без базы данных API недоступен —
 * показывается пояснение, а личный прогресс по-прежнему хранится в браузере.
 */
export default function ClassStats({ totals }: ClassStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unavailable">(API_ENABLED ? "loading" : "unavailable");

  useEffect(() => {
    if (!API_ENABLED) return;
    let cancelled = false;
    fetch(api("/api/quiz"), { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((d: Stats) => {
        if (cancelled) return;
        setStats(d);
        setState("ok");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card h-full p-6" style={{ background: "var(--green)", color: "var(--on-accent)", borderColor: "transparent" }}>
      <h3 className="text-lg font-bold ff-serif">Статистика класса</h3>

      {state === "loading" && (
        <div className="mt-3 space-y-2" aria-label="Загрузка">
          <div className="skeleton h-8 w-24 opacity-40" />
          <div className="skeleton h-3 w-40 opacity-40" />
        </div>
      )}

      {state === "ok" && stats && stats.attempts > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="ff-serif text-3xl font-bold" style={{ color: "var(--gold-tint)" }}>
              {stats.attempts}
            </p>
            <p className="text-xs opacity-85">прохождений викторин</p>
          </div>
          <div>
            <p className="ff-serif text-3xl font-bold" style={{ color: "var(--gold-tint)" }}>
              {stats.avgPercent ?? 0}%
            </p>
            <p className="text-xs opacity-85">средний результат</p>
          </div>
        </div>
      )}

      {state === "ok" && (!stats || stats.attempts === 0) && (
        <p className="mt-2 text-sm opacity-90 leading-relaxed">
          Пока никто не проходил викторины. Результаты всех учеников собираются на сервере и показываются здесь, а личный прогресс хранится в браузере.
        </p>
      )}

      {state === "unavailable" && (
        <p className="mt-2 text-sm opacity-90 leading-relaxed">
          Это статическая версия сайта: общая статистика класса собирается только при запуске с сервером и базой данных. Ваш личный прогресс и результаты викторин
          сохраняются в браузере.
        </p>
      )}

      <p className="mt-4 text-xs opacity-75">
        В базе: {totals.persons} персоналий, {totals.points} точек на картах, {totals.questions} вопросов.
      </p>
    </div>
  );
}
