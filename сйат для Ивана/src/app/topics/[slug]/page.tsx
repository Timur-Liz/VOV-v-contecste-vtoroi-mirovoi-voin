import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdjacentTopics, getTopic, topics } from "@/data/topics";
import { absoluteAsset } from "@/lib/paths";
import SmartImage from "@/components/SmartImage";
import TopicNav from "@/components/TopicNav";
import TopicMap from "@/components/TopicMap";
import Timeline from "@/components/Timeline";
import AiSummary from "@/components/AiSummary";
import Persons from "@/components/Persons";
import Gallery from "@/components/Gallery";
import Quiz from "@/components/Quiz";
import TopicPager from "@/components/TopicPager";
import MarkStudied from "@/components/MarkStudied";
import BackToTop from "@/components/BackToTop";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Тема не найдена" };
  return {
    title: topic.shortTitle,
    description: topic.annotation,
    openGraph: { title: topic.title, description: topic.annotation, images: [absoluteAsset(topic.cover)] },
  };
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-3">{title}</h2>
      {text && <p className="mt-3 text-soft leading-relaxed">{text}</p>}
    </Reveal>
  );
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const { prev, next } = getAdjacentTopics(slug);
  const pointIds = topic.map.points.map((p) => p.id);

  return (
    <>
      <TopicNav number={topic.number} shortTitle={topic.shortTitle} />

      <main id="main" data-topic={topic.slug}>
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <SmartImage src={topic.cover} fallbacks={topic.coverFallbacks} alt="" className="hero-img" loading="eager" fetchPriority="high" whenBroken="hide" />
          <div className="hero-overlay" />
          <div className="container-x relative pb-10 pt-16 sm:pb-14 sm:pt-28 md:pt-36">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip" style={{ background: "rgba(255,250,240,0.16)", color: "#fff8ea", border: "1px solid rgba(255,250,240,0.3)" }}>
                {topic.paragraph}
              </span>
              <span className="chip" style={{ background: "var(--wine)", color: "#fff" }}>
                {topic.period}
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "#f1d27a" }}>
              {topic.hero.subtitle}
            </p>
            <h1 className="mt-3 max-w-4xl ff-serif text-[clamp(2rem,4.8vw,3.6rem)] font-bold leading-[1.1]">{topic.title}</h1>
            <p className="mt-5 max-w-3xl text-[clamp(1rem,1.3vw,1.15rem)] leading-relaxed" style={{ color: "rgba(255,248,234,0.9)" }}>
              {topic.hero.lead}
            </p>
            <div className="hero-actions mt-7">
              <a href="#overview" className="btn btn-wine">
                Начать изучение
              </a>
              <a href="#quiz" className="btn btn-light">
                Сразу к викторине
              </a>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3 lg:grid-cols-4">
              {topic.hero.stats.map((s) => (
                <div key={s.label} className="hero-stat">
                  <dt className="ff-serif text-base font-bold leading-tight sm:text-xl">{s.value}</dt>
                  <dd className="mt-1 text-xs opacity-85 leading-snug">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- Обзор ---------- */}
        <section id="overview" className="section">
          <div className="container-x">
            <SectionHead eyebrow="Обзор темы" title="Что нужно знать" />
            <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-8 sm:space-y-10">
                {topic.intro.map((block, i) => (
                  <Reveal key={block.heading} delay={Math.min(i, 3) * 60}>
                    <article className="prose-hist">
                      <h3 className="ff-serif text-xl sm:text-2xl font-bold text-ink mb-3 sm:mb-4 flex gap-3 items-baseline">
                        <span className="text-gold text-base font-sans font-extrabold">0{i + 1}</span>
                        {block.heading}
                      </h3>
                      {block.paragraphs.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                    </article>
                  </Reveal>
                ))}
              </div>

              <aside className="grid gap-5 sm:grid-cols-2 sm:items-start lg:sticky lg:top-24 lg:grid-cols-1 lg:self-start">
                <Reveal>
                  <div className="card p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Прогресс по теме</p>
                    <div className="mt-3" data-widget="mark">
                      <MarkStudied slug={topic.slug} />
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={80}>
                  <div className="card p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Ключевые понятия</p>
                    <dl className="mt-3 space-y-3">
                      {topic.keyTerms.map((t) => (
                        <div key={t.term}>
                          <dt className="font-bold ff-serif text-ink">{t.term}</dt>
                          <dd className="text-sm text-soft leading-relaxed">{t.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Reveal>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- Карта ---------- */}
        <section id="map" className="section section-alt">
          <div className="container-x">
            <SectionHead
              eyebrow="Интерактивная карта"
              title="География событий"
              text="Нажмите на метку или на пункт списка, чтобы прочитать справку о месте. Линии фронта и направления ударов показаны схематично."
            />
            <div className="mt-8">
              <TopicMap map={topic.map} />
            </div>
          </div>
        </section>

        {/* ---------- Хронология ---------- */}
        <section id="timeline" className="section">
          <div className="container-x">
            <SectionHead eyebrow="Хронология" title="Ключевые события" text={`${topic.timeline.length} дат, которые нужно помнить по теме.`} />
            <div className="mt-10 max-w-3xl">
              <Timeline events={topic.timeline} pointIds={pointIds} />
            </div>
          </div>
        </section>

        {/* ---------- ИИ-конспект ---------- */}
        <section id="summary" className="section section-alt">
          <div className="container-x">
            <SectionHead
              eyebrow="Конспект через ИИ"
              title="Краткое содержание темы"
              text="Сервер отправляет текст темы в языковую модель и возвращает тезисы. Если ИИ-сервис не настроен или недоступен, показывается заранее подготовленный конспект — механика «сократить / расширить» работает в обоих случаях."
            />
            <div className="mt-8 max-w-4xl" data-widget="summary">
              <AiSummary slug={topic.slug} title={topic.title} local={topic.summary} />
            </div>
          </div>
        </section>

        {/* ---------- Личности ---------- */}
        <section id="persons" className="section">
          <div className="container-x">
            <SectionHead eyebrow="Личности" title="Люди этой темы" text={`${topic.persons.length} исторических деятелей, чьи имена встречаются в параграфе.`} />
            <div className="mt-8">
              <Persons persons={topic.persons} />
            </div>
          </div>
        </section>

        {/* ---------- Галерея ---------- */}
        <section id="gallery" className="section section-alt">
          <div className="container-x">
            <SectionHead
              eyebrow="Галерея"
              title="Изображения и документы"
              text="Исторические фотографии и снимки мемориалов — из открытых коллекций Wikimedia Commons и Pexels (авторы и лицензии указаны в подписях). Иллюстрации, помеченные как художественная реконструкция, созданы для наглядности."
            />
            <div className="mt-8" data-widget="gallery">
              <Gallery items={topic.gallery} />
            </div>
          </div>
        </section>

        {/* ---------- Викторина ---------- */}
        <section id="quiz" className="section">
          <div className="container-x">
            <SectionHead
              eyebrow="Викторина"
              title="Проверьте себя"
              text={`${topic.quiz.length} вопросов с объяснениями. После прохождения результат сохранится, а тема будет отмечена как изученная.`}
            />
            <div className="mt-8 max-w-3xl" data-widget="quiz">
              <Quiz slug={topic.slug} questions={topic.quiz} />
            </div>
          </div>
        </section>

        <TopicPager prev={prev} next={next} />
      </main>

      <SiteFooter />
      <BackToTop />
      <div className="sr-only">
        <Link href="/">Вернуться на главную</Link>
      </div>
    </>
  );
}
