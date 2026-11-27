import type { Person } from "@/data/types";
import Reveal from "./Reveal";
import SmartImage from "./SmartImage";

function initials(name: string) {
  const cleaned = name.replace(/\(.*?\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const PALETTE = ["var(--green)", "var(--wine)", "var(--gold)", "var(--green-2)"];

function Initials({ name, index, className = "" }: { name: string; index: number; className?: string }) {
  return (
    <div className={`person-initials ${className}`} style={{ background: PALETTE[index % PALETTE.length] }} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

/**
 * Карточки исторических деятелей темы: реальный портрет (локальный файл → Wikimedia Commons)
 * или инициалы, если портрета нет либо он не загрузился.
 */
export default function Persons({ persons }: { persons: Person[] }) {
  return (
    <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {persons.map((p, i) => (
        <Reveal key={p.name} delay={(i % 3) * 80}>
          <article className="card person-card h-full">
            {p.photo ? (
              <figure className="person-photo shrink-0" title={p.photo.credit}>
                <SmartImage
                  src={p.photo.src}
                  fallbacks={p.photo.fallbacks}
                  alt={`Портрет: ${p.name}`}
                  brokenContent={<Initials name={p.name} index={i} className="person-initials--fill" />}
                />
              </figure>
            ) : (
              <Initials name={p.name} index={i} />
            )}
            <div className="min-w-0">
              <h3 className="font-bold ff-serif leading-snug text-ink">{p.name}</h3>
              {p.years && <p className="text-xs font-semibold text-wine mt-0.5">{p.years}</p>}
              <p className="mt-1 text-sm font-semibold text-soft">{p.role}</p>
              <p className="mt-2 text-sm text-soft leading-relaxed">{p.description}</p>
              {p.photo && (
                <p className="mt-2 text-[11px] text-muted leading-snug">
                  {p.photo.note ? `${p.photo.note} · ` : "Фото: "}
                  {p.photo.credit}
                </p>
              )}
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
