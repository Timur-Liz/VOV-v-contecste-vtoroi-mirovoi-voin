import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-elev">
      <div className="container-x flex flex-col gap-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold text-ink ff-serif">Великая Отечественная война в контексте Второй мировой войны</p>
          <p className="mt-1">
            Образовательный проект по разделу III учебника «История Беларуси, 1917 г. — начало XXI в.» (9 класс). Портреты и исторические фото — Wikimedia Commons
            (свободные лицензии, авторы указаны в подписях); иллюстрации, помеченные как художественная реконструкция, созданы для учебных целей. Границы — geoBoundaries, реки — Natural Earth.
          </p>
        </div>
        <nav className="flex gap-4 shrink-0" aria-label="Подвал">
          <Link href="/" className="hover:text-ink">
            Все темы
          </Link>
          <Link href="/#about" className="hover:text-ink">
            О проекте
          </Link>
        </nav>
      </div>
    </footer>
  );
}
