/** Секции страницы темы — используются и в липкой навигации, и в разметке страницы */
export const TOPIC_SECTIONS = [
  { id: "overview", label: "Обзор" },
  { id: "map", label: "Карта" },
  { id: "timeline", label: "Хронология" },
  { id: "summary", label: "ИИ-конспект" },
  { id: "persons", label: "Личности" },
  { id: "gallery", label: "Галерея" },
  { id: "quiz", label: "Викторина" },
] as const;

/** Событие «показать точку на карте» (таймлайн → карта) */
export const FOCUS_POINT_EVENT = "vov:focus-point";
