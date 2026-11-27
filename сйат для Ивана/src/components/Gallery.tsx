"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GalleryItem } from "@/data/types";
import Reveal from "./Reveal";
import SmartImage from "./SmartImage";

type ImageItem = Extract<GalleryItem, { type: "image" }>;

interface GalleryProps {
  items: GalleryItem[];
}

/**
 * Галерея изображений и документов с лайтбоксом.
 * Изображения загружаются через SmartImage (локальный файл → оригинал на Wikimedia Commons);
 * если фото недоступно совсем, карточка скрывается, чтобы не оставлять «битых» рамок.
 */
export default function Gallery({ items }: GalleryProps) {
  const [broken, setBroken] = useState<Set<number>>(() => new Set());
  const [open, setOpen] = useState<number | null>(null);

  const markBroken = useCallback((i: number) => {
    setBroken((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  }, []);

  const visible = useMemo(() => items.map((item, i) => ({ item, i })).filter(({ i }) => !broken.has(i)), [items, broken]);
  const images = useMemo(() => visible.filter((v): v is { item: ImageItem; i: number } => v.item.type === "image"), [visible]);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      setOpen((cur) => (cur === null || images.length === 0 ? cur : (cur + dir + images.length) % images.length));
    },
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  const current = open !== null ? images[open]?.item : undefined;

  return (
    <>
      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ item, i }, order) => {
          if (item.type === "image") {
            const imgIndex = images.findIndex((v) => v.i === i);
            return (
              <Reveal key={i} delay={(order % 3) * 80}>
                <figure className="card overflow-hidden h-full flex flex-col">
                  <button type="button" className="group relative block aspect-[4/3] overflow-hidden text-left" onClick={() => setOpen(imgIndex)} aria-label={`Открыть: ${item.caption}`} data-caption={item.caption}>
                    <SmartImage
                      src={item.src}
                      fallbacks={item.fallbacks}
                      alt={item.alt}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      whenBroken="hide"
                      onBroken={() => markBroken(i)}
                    />
                    <span className="gallery-zoom" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </span>
                  </button>
                  <figcaption className="p-4 text-sm text-soft leading-relaxed flex-1">
                    {item.caption}
                    {item.source && <span className="mt-1 block text-xs text-muted">{item.source}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            );
          }
          if (item.type === "numbers") {
            return (
              <Reveal key={i} delay={(order % 3) * 80}>
                <div className="card h-full p-5" style={{ background: "var(--green)", color: "var(--on-accent)", borderColor: "transparent" }}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">{item.title}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    {item.items.map((n, j) => (
                      <div key={j}>
                        <dt className="ff-serif text-2xl font-bold leading-none" style={{ color: "var(--gold-tint)" }}>
                          {n.value}
                        </dt>
                        <dd className="mt-1 text-xs opacity-85 leading-snug">{n.label}</dd>
                      </div>
                    ))}
                  </dl>
                  {item.source && <p className="mt-4 text-[11px] opacity-70">{item.source}</p>}
                </div>
              </Reveal>
            );
          }
          return (
            <Reveal key={i} delay={(order % 3) * 80}>
              <article className="doc-card">
                <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-wine">Документ</p>
                <h4 className="mt-2 pr-8 text-lg font-bold leading-snug">{item.title}</h4>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-soft">{item.text}</p>
                <p className="mt-4 text-xs text-muted font-sans">{item.source}</p>
              </article>
            </Reveal>
          );
        })}
      </div>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Просмотр изображения" onClick={close}>
          <div className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <SmartImage key={current.src} src={current.src} fallbacks={current.fallbacks} alt={current.alt} loading="eager" className="lightbox__img" />
            <p className="lightbox__caption">{current.caption}</p>
            <button type="button" className="btn btn-light btn-icon lightbox__close" onClick={close} aria-label="Закрыть">
              ✕
            </button>
            {images.length > 1 && (
              <>
                <button type="button" className="btn btn-light btn-icon lightbox__prev" onClick={() => step(-1)} aria-label="Предыдущее">
                  ‹
                </button>
                <button type="button" className="btn btn-light btn-icon lightbox__next" onClick={() => step(1)} aria-label="Следующее">
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
