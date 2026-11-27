"use client";

import type { TimelineEvent } from "@/data/types";
import Reveal from "./Reveal";
import { FOCUS_POINT_EVENT } from "./topicSections";

interface TimelineProps {
  events: TimelineEvent[];
  pointIds: string[];
}

/** Вертикальный таймлайн ключевых событий темы */
export default function Timeline({ events, pointIds }: TimelineProps) {
  const showOnMap = (id: string) => {
    window.dispatchEvent(new CustomEvent(FOCUS_POINT_EVENT, { detail: id }));
  };

  return (
    <ol className="timeline" aria-label="Хронология событий">
      {events.map((event, i) => {
        const hasPoint = event.pointId ? pointIds.includes(event.pointId) : false;
        return (
          <li key={`${event.date}-${i}`} className="timeline-item">
            <Reveal delay={Math.min(i, 6) * 60}>
              <div className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <time className="timeline-date">{event.date}</time>
                  {hasPoint && (
                    <button type="button" className="btn btn-ghost btn-sm" data-point-id={event.pointId} onClick={() => showOnMap(event.pointId as string)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      На карте
                    </button>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-bold ff-serif text-ink">{event.title}</h3>
                <p className="mt-1.5 text-soft leading-relaxed">{event.description}</p>
              </div>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
