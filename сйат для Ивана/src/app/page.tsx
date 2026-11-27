import Link from "next/link";
import { getAllTags, getTopicSummaries, topics } from "@/data/topics";
import { HUB_HERO_FALLBACKS } from "@/data/photos";
import SmartImage from "@/components/SmartImage";
import HubGrid from "@/components/HubGrid";
import ThemeToggle from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import BackToTop from "@/components/BackToTop";
import Reveal from "@/components/Reveal";
import ClassStats from "@/components/ClassStats";

/**
 * Хаб — главная страница-навигатор. Полностью статическая: данные тем берутся из
 * src/data, а статистика класса подгружается на клиенте (если сервер доступен).
 */
export default function HomePage() {
  const summaries = getTopicSummaries();
  const tags = getAllTags();

  const totals = {
    topics: topics.length,
    questions: topics.reduce((n, t) => n + t.quiz.length, 0),
    points: topics.reduce((n, t) => n + t.map.points.length, 0),
    persons: topics.reduce((n, t) => n + t.persons.length, 0),
    events: topics.reduce((n, t) => n + t.timeline.length, 0),
  };

  return (
    <>
      <main id="main">
        {/* ---------- Hero хаба ---------- */}
        <section className="hero hero--hub">
          <SmartImage src="/images/hub-hero.jpg" fallbacks={HUB_HERO_FALLBACKS} alt="" className="hero-img" loading="eager" fetchPriority="high" whenBroken="hide" />
          <div className="hero-overlay" />

          <div className="absolute inset-x-0 top-0 z-10">
            <div className="container-x flex items-center justify-between py-4">
              <div className="flex items-center gap-3 text-sm font-bold" style={{ color: "#fff8ea" }}>
                <span className="grid h-9 w-9 place-items-center rounded-full ff-serif text-base" style={{ background: "var(--wine)" }}>
                  Б
                </span>
                <span className="hidden sm:inline">История Беларуси · 9 класс · Раздел III</span>
              </div>
              <div className="flex items-center gap-2">
                <a href="#about" className="btn btn-light btn-sm hidden sm:inline-flex">
                  О проекте
                </a>
                <ThemeToggle variant="light" />
              </div>
            </div>
          </div>

          <div className="container-x relative pb-12 pt-28 sm:pb-16 sm:pt-40">
            <p className="eyebrow" style={{ color: "#f1d27a" }}>
              Образовательный проект
            </p>
            <h1 className="mt-4 max-w-4xl ff-serif text-[clamp(2.1rem,5.2vw,4rem)] font-bold leading-[1.08]">
              Великая Отечественная война в контексте Второй мировой войны
            </h1>
            <p className="mt-5 max-w-2xl text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed" style={{ color: "rgba(255,248,234,0.88)" }}>
              Восемь тем раздела «БССР в годы Второй мировой и Великой Отечественной войн» — каждая как отдельный мини-сайт: интерактивная карта,
              хронология, ИИ-конспект, личности, галерея документов и викторина с проверкой знаний.
            </p>
            <div className="hero-actions mt-8">
              <a href="#topics" className="btn btn-wine">
                Начать изучение
              </a>
              <Link href="/topics/operatsiya-bagration" className="btn btn-light">
                Открыть тему «Багратион» →
              </Link>
            </div>

            <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-12 sm:grid-cols-4 sm:gap-3">
              {[
                { v: totals.topics, l: "тем-параграфов" },
                { v: totals.events, l: "событий в хронологиях" },
                { v: totals.points, l: "точек на картах" },
                { v: totals.questions, l: "вопросов викторин" },
              ].map((s) => (
                <div key={s.l} className="hero-stat">
                  <dt className="ff-serif text-2xl font-bold">{s.v}</dt>
                  <dd className="text-xs opacity-85">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- Сетка тем ---------- */}
        <HubGrid topics={summaries} tags={tags} />

        {/* ---------- О проекте ---------- */}
        <section id="about" className="section section-alt">
          <div className="container-x">
            <Reveal>
              <p className="eyebrow">О проекте</p>
              <h2 className="section-title mt-3 max-w-3xl">Учебник, превращённый в интерактивное путешествие</h2>
            </Reveal>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <Reveal delay={0}>
                <div className="card h-full p-6">
                  <h3 className="text-lg font-bold ff-serif">Источник содержания</h3>
                  <p className="mt-2 text-sm text-soft leading-relaxed">
                    Факты, даты и имена соответствуют разделу III «БССР в годы Второй мировой и Великой Отечественной войн» учебного пособия «История Беларуси, 1917 г. —
                    начало XXI в.» для 9 класса (§ 11–16). Каждая тема сайта соответствует параграфу или его крупной части.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="card h-full p-6">
                  <h3 className="text-lg font-bold ff-serif">Как заниматься</h3>
                  <ol className="mt-2 space-y-1.5 text-sm text-soft leading-relaxed list-decimal pl-5">
                    <li>Прочитайте обзор темы и изучите карту событий.</li>
                    <li>Пройдите хронологию — кнопка «На карте» покажет место события.</li>
                    <li>Сгенерируйте конспект нужного объёма и повторите личности.</li>
                    <li>Пройдите викторину — тема отметится изученной, а результат сохранится.</li>
                  </ol>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <ClassStats totals={{ persons: totals.persons, points: totals.points, questions: totals.questions }} />
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </>
  );
}
