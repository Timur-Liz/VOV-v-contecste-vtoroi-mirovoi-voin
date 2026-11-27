import type { Metadata } from "next";
import Link from "next/link";
import { getTopicSummaries } from "@/data/topics";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Все темы",
  description: "Список тем раздела «БССР в годы Второй мировой и Великой Отечественной войн».",
};

/** /topics — простой статический список тем (дублирует навигацию хаба) */
export default function TopicsIndexPage() {
  const topics = getTopicSummaries();
  return (
    <>
      <main id="main" className="container-x py-16">
        <p className="eyebrow">Оглавление</p>
        <h1 className="section-title mt-3">Темы раздела</h1>
        <ol className="mt-8 grid gap-3 md:grid-cols-2">
          {topics.map((t) => (
            <li key={t.slug}>
              <Link href={`/topics/${t.slug}`} className="card topic-card flex items-center gap-4 p-4 no-underline">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: "var(--wine)", color: "#fff" }}>
                  {t.number}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted">
                    {t.paragraph} · {t.period}
                  </span>
                  <span className="block font-bold ff-serif text-ink leading-snug">{t.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Link href="/" className="btn btn-ghost">
            ⌂ На главную
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
