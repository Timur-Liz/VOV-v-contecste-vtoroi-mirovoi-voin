/**
 * Типы данных для тем учебника.
 * Каждая тема хранится в отдельном файле src/data/topics/topic-XX-*.ts —
 * чтобы добавить новую тему, достаточно создать такой файл и подключить
 * его в src/data/topics/index.ts.
 */

export type PointKind = "battle" | "city" | "memorial" | "camp" | "event" | "partisan";

export interface MapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
  date?: string;
  description: string;
  kind?: PointKind;
  /** Пометка, если положение показано схематично */
  approximate?: boolean;
}

export interface MapLine {
  title: string;
  color?: string;
  dashed?: boolean;
  points: [number, number][];
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  /** id точки на карте, к которой относится событие */
  pointId?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** индекс правильного варианта */
  correct: number;
  explanation: string;
}

export type GalleryItem =
  | {
      type: "image";
      src: string;
      /** Запасные источники (например, оригинал на Wikimedia Commons) */
      fallbacks?: string[];
      alt: string;
      caption: string;
      source?: string;
    }
  | {
      type: "document";
      title: string;
      text: string;
      source: string;
    }
  | {
      type: "numbers";
      title: string;
      items: { value: string; label: string }[];
      source?: string;
    };

export interface Person {
  name: string;
  role: string;
  years?: string;
  description: string;
  /** Реальный портрет (Wikimedia Commons); если нет — показываются инициалы */
  photo?: { src: string; credit: string; note?: string; fallbacks?: string[] };
}

export interface IntroSection {
  heading: string;
  paragraphs: string[];
}

export interface Topic {
  number: number;
  slug: string;
  /** Параграф учебника */
  paragraph: string;
  title: string;
  shortTitle: string;
  period: string;
  annotation: string;
  cover: string;
  /** Запасные обложки: реальное фото по теме (локально и с Wikimedia Commons) */
  coverFallbacks?: string[];
  tags: string[];
  hero: {
    subtitle: string;
    lead: string;
    stats: { value: string; label: string }[];
  };
  intro: IntroSection[];
  keyTerms: { term: string; definition: string }[];
  map: {
    center: [number, number];
    zoom: number;
    points: MapPoint[];
    lines?: MapLine[];
  };
  timeline: TimelineEvent[];
  /** Заранее подготовленные конспекты (fallback, если ИИ-API недоступен) */
  summary: {
    short: string[];
    medium: string[];
    full: string[];
  };
  persons: Person[];
  gallery: GalleryItem[];
  quiz: QuizQuestion[];
}

export interface TopicSummary {
  number: number;
  slug: string;
  paragraph: string;
  title: string;
  shortTitle: string;
  period: string;
  annotation: string;
  cover: string;
  coverFallbacks?: string[];
  tags: string[];
  quizCount: number;
}
