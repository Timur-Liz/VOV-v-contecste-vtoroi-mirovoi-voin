import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSummaries } from "@/db/schema";
import { getTopic, topicToPlainText } from "@/data/topics";

export const dynamic = "force-dynamic";

type Mode = "short" | "medium" | "full";
const MODES: Record<Mode, { count: string; style: string }> = {
  short: { count: "4–5", style: "самое главное: ключевые даты, итог и значение" },
  medium: { count: "7–9", style: "основные события, участники, причины и итоги" },
  full: { count: "12–15", style: "подробный конспект для подготовки к контрольной: даты, имена, цифры, термины, причины и следствия" },
};

function isMode(value: unknown): value is Mode {
  return value === "short" || value === "medium" || value === "full";
}

/** Запрос к OpenAI-совместимому API. Ключ хранится только на сервере. */
async function generateWithOpenAI(text: string, mode: Mode, apiKey: string) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты — учитель истории Беларуси. Составь конспект темы школьного учебника СТРОГО на основе переданного текста: не добавляй фактов, дат и имён, которых нет в тексте. " +
              "Пиши по-русски, тезисами, каждый тезис — одно-два предложения. Верни JSON вида {\"bullets\": [\"...\", \"...\"]}.",
          },
          {
            role: "user",
            content: `Составь конспект из ${MODES[mode].count} тезисов. Акцент: ${MODES[mode].style}.\n\nТекст темы:\n${text}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";

    let bullets: string[] = [];
    try {
      const parsed = JSON.parse(content) as { bullets?: unknown };
      if (Array.isArray(parsed.bullets)) bullets = parsed.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0);
    } catch {
      bullets = content
        .split("\n")
        .map((l) => l.replace(/^[\s•\-*\d.)]+/, "").trim())
        .filter(Boolean);
    }
    if (!bullets.length) throw new Error("Empty answer");
    return { bullets, model };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { slug?: string; mode?: unknown; forceLocal?: boolean } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const mode: Mode = isMode(body?.mode) ? body.mode : "medium";
  const forceLocal = Boolean(body?.forceLocal);

  const topic = getTopic(slug);
  if (!topic) return Response.json({ error: "Тема не найдена" }, { status: 404 });

  const local = { bullets: topic.summary[mode], source: "local" as const };
  const apiKey = process.env.OPENAI_API_KEY;

  if (forceLocal) return Response.json(local);
  if (!apiKey) {
    return Response.json({ ...local, note: "Ключ OPENAI_API_KEY не настроен — показан заранее подготовленный конспект." });
  }

  // 1. Кэш в базе данных
  try {
    const cached = await db
      .select()
      .from(aiSummaries)
      .where(and(eq(aiSummaries.topicSlug, slug), eq(aiSummaries.mode, mode), eq(aiSummaries.source, "openai")))
      .orderBy(desc(aiSummaries.createdAt))
      .limit(1);
    if (cached[0]) {
      const bullets = JSON.parse(cached[0].content) as string[];
      return Response.json({ bullets, source: "openai", model: cached[0].model ?? undefined, cached: true });
    }
  } catch {
    /* БД недоступна — продолжаем без кэша */
  }

  // 2. Генерация
  try {
    const { bullets, model } = await generateWithOpenAI(topicToPlainText(topic), mode, apiKey);
    try {
      await db.insert(aiSummaries).values({ topicSlug: slug, mode, source: "openai", model, content: JSON.stringify(bullets) });
    } catch {
      /* кэш не обязателен */
    }
    return Response.json({ bullets, source: "openai", model });
  } catch {
    // 3. Fallback
    return Response.json({ ...local, note: "ИИ-сервис временно недоступен — показан заранее подготовленный конспект." });
  }
}
