"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAsset } from "@/lib/useAsset";

interface SmartImageProps {
  /** Основной источник: «/images/…» из public/ или внешний URL */
  src: string;
  /** Запасные источники — пробуются по очереди, если предыдущий не загрузился */
  fallbacks?: string[];
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "auto";
  /** Что показать, если не загрузился ни один источник: заглушку (по умолчанию) или ничего */
  whenBroken?: "placeholder" | "hide";
  /** Своё содержимое вместо стандартной заглушки (например, инициалы персоны) */
  brokenContent?: ReactNode;
  /** Вызывается, когда все источники исчерпаны */
  onBroken?: () => void;
}

/**
 * Изображение, которое не «ломается»:
 * локальный файл → запасные источники (например, оригинал на Wikimedia Commons) → заглушка.
 * Так картинки видны, даже если файлы из public/images не попали в копию проекта
 * или сайт лежит в непредвиденной подпапке.
 */
export default function SmartImage({
  src,
  fallbacks,
  alt,
  className = "",
  loading = "lazy",
  fetchPriority,
  whenBroken = "placeholder",
  brokenContent,
  onBroken,
}: SmartImageProps) {
  const resolve = useAsset();
  const sources = useMemo(() => Array.from(new Set([src, ...(fallbacks ?? [])].filter(Boolean).map(resolve))), [src, fallbacks, resolve]);
  // Состояние привязано к набору источников: при его смене отсчёт начинается заново
  const sourcesKey = sources.join("|");
  const [state, setState] = useState({ key: sourcesKey, index: 0 });
  const index = state.key === sourcesKey ? state.index : 0;
  const ref = useRef<HTMLImageElement>(null);
  const exhausted = index >= sources.length;

  const fail = useCallback(
    () => setState((s) => ({ key: sourcesKey, index: (s.key === sourcesKey ? s.index : 0) + 1 })),
    [sourcesKey],
  );

  // Ошибка могла произойти ещё до гидратации — тогда onError уже не сработает
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && img.currentSrc !== "") fail();
  }, [index, fail]);

  useEffect(() => {
    if (exhausted) onBroken?.();
  }, [exhausted, onBroken]);

  if (exhausted) {
    if (brokenContent !== undefined) return <>{brokenContent}</>;
    if (whenBroken === "hide") return null;
    return (
      <span className={`img-fallback ${className}`} role="img" aria-label={alt || "Изображение недоступно"}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
        <span>Изображение недоступно</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={sources[index]}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onError={fail}
      // Метки для автономной (без React) версии сайта — см. assets/js/site.js
      data-fallbacks={fallbacks && fallbacks.length ? JSON.stringify(fallbacks) : undefined}
      data-broken={brokenContent !== undefined ? "initials" : whenBroken}
    />
  );
}
