import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Великая Отечественная война в контексте Второй мировой — История Беларуси",
    template: "%s — ВОВ в истории Беларуси",
  },
  description:
    "Образовательный сайт по разделу «БССР в годы Второй мировой и Великой Отечественной войн» учебника истории Беларуси: интерактивные карты, хронология, конспекты, викторины.",
};

export const viewport: Viewport = {
  themeColor: "#1f3d2b",
  width: "device-width",
  initialScale: 1,
};

/* Применяем сохранённую тему до первой отрисовки, чтобы избежать «мигания» */
const themeScript = `(function(){try{var t=localStorage.getItem('vov_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Видна только если файл стилей не загрузился (сайт открыт не из корня сервера или как file://) */}
        <div
          className="css-missing-note"
          style={{ padding: "16px", margin: "0 0 16px", border: "2px solid #7a1f2b", background: "#fff7e6", color: "#1f1c17", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}
        >
          <strong>Стили сайта не загрузились.</strong> Скорее всего, страница открыта как файл или не из корня сервера. В терминале VS Code выполните{" "}
          <code>npm run build:static</code>, затем <code>npm run preview:static</code> и откройте <code>http://localhost:4173</code> — либо запустите{" "}
          <code>npm run dev</code> и откройте <code>http://localhost:3000</code>.
        </div>
        <a href="#main" className="sr-only sr-only-focusable">
          Перейти к содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
