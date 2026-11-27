import Link from "next/link";
import type { Topic } from "@/data/types";

interface TopicPagerProps {
  prev?: Topic;
  next?: Topic;
}

/** Навигация «предыдущая / следующая тема» + возврат в хаб */
export default function TopicPager({ prev, next }: TopicPagerProps) {
  return (
    <nav className="container-x pb-16" aria-label="Навигация между темами">
      <div className="grid gap-4 md:grid-cols-2">
        {prev ? (
          <Link href={`/topics/${prev.slug}`} className="card topic-card p-5 flex items-center gap-4 no-underline">
            <span className="text-2xl text-muted" aria-hidden="true">
              ←
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted">Предыдущая тема · {prev.paragraph}</span>
              <span className="mt-1 block font-bold ff-serif text-ink leading-snug">{prev.shortTitle}</span>
              <span className="block text-xs text-wine font-semibold mt-1">{prev.period}</span>
            </span>
          </Link>
        ) : (
          <div className="card p-5 flex items-center gap-4 opacity-70">
            <span className="text-2xl text-muted" aria-hidden="true">
              ←
            </span>
            <span className="text-sm text-muted">Это первая тема раздела</span>
          </div>
        )}

        {next ? (
          <Link href={`/topics/${next.slug}`} className="card topic-card p-5 flex items-center justify-end gap-4 text-right no-underline">
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted">Следующая тема · {next.paragraph}</span>
              <span className="mt-1 block font-bold ff-serif text-ink leading-snug">{next.shortTitle}</span>
              <span className="block text-xs text-wine font-semibold mt-1">{next.period}</span>
            </span>
            <span className="text-2xl text-muted" aria-hidden="true">
              →
            </span>
          </Link>
        ) : (
          <div className="card p-5 flex items-center justify-end gap-4 text-right opacity-70">
            <span className="text-sm text-muted">Это последняя тема раздела</span>
            <span className="text-2xl text-muted" aria-hidden="true">
              →
            </span>
          </div>
        )}
      </div>
      <div className="mt-6 text-center">
        <Link href="/" className="btn btn-ghost">
          ⌂ Вернуться ко всем темам
        </Link>
      </div>
    </nav>
  );
}
