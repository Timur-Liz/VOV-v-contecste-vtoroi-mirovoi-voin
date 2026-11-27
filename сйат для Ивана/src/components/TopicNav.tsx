"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { TOPIC_SECTIONS } from "./topicSections";

interface TopicNavProps {
  number: number;
  shortTitle: string;
}

/**
 * Липкая навигация темы.
 * Телефон/планшет — две строки: «← Темы · название · тема оформления» и прокручиваемая
 * лента разделов (активный раздел сам подъезжает в центр).
 * Десктоп (≥ 1024px) — одна строка.
 */
export default function TopicNav({ number, shortTitle }: TopicNavProps) {
  const [active, setActive] = useState<string>(TOPIC_SECTIONS[0].id);
  const [progress, setProgress] = useState(0);
  const linksRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = TOPIC_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Активная ссылка подъезжает в центр ленты (только горизонтальная прокрутка самой ленты)
  useEffect(() => {
    const nav = linksRef.current;
    const link = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    const left = link.offsetLeft - nav.clientWidth / 2 + link.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <header className="topic-nav" role="banner">
      <div className="container-x topic-nav__bar">
        <Link href="/" className="topic-nav__back" aria-label="Вернуться к списку тем">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <span className="sm:hidden">Темы</span>
          <span className="hidden sm:inline">Все темы</span>
        </Link>

        <div className="topic-nav__title" title={shortTitle}>
          <span className="topic-nav__badge" aria-hidden="true">
            {number}
          </span>
          <span className="truncate">{shortTitle}</span>
        </div>

        <nav ref={linksRef} className="topic-nav__links nav-scroll" aria-label="Разделы темы">
          {TOPIC_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-section={s.id}
              className={`nav-link ${active === s.id ? "is-active" : ""}`}
              aria-current={active === s.id ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="topic-nav__toggle">
          <ThemeToggle />
        </div>
      </div>
      <div className="nav-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    </header>
  );
}
