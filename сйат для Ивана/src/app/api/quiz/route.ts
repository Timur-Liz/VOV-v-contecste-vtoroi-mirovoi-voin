import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { getTopic } from "@/data/topics";

export const dynamic = "force-dynamic";

const percentExpr = sql`case when ${quizAttempts.total} > 0 then ${quizAttempts.score}::numeric / ${quizAttempts.total} * 100 end`;

async function statsFor(slug: string) {
  const [row] = await db
    .select({
      attempts: sql<number>`count(*)::int`,
      avgPercent: sql<number | null>`round(avg(${percentExpr}))::int`,
      bestPercent: sql<number | null>`round(max(${percentExpr}))::int`,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.topicSlug, slug));
  return {
    attempts: row?.attempts ?? 0,
    avgPercent: row?.avgPercent ?? null,
    bestPercent: row?.bestPercent ?? null,
  };
}

/** GET /api/quiz?slug=... — статистика по теме; без slug — общая */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  try {
    if (slug) return Response.json(await statsFor(slug));

    const [row] = await db
      .select({
        attempts: sql<number>`count(*)::int`,
        avgPercent: sql<number | null>`round(avg(${percentExpr}))::int`,
      })
      .from(quizAttempts);
    const perTopic = await db
      .select({ topicSlug: quizAttempts.topicSlug, attempts: sql<number>`count(*)::int`, avgPercent: sql<number | null>`round(avg(${percentExpr}))::int` })
      .from(quizAttempts)
      .groupBy(quizAttempts.topicSlug);
    return Response.json({ attempts: row?.attempts ?? 0, avgPercent: row?.avgPercent ?? null, perTopic });
  } catch {
    return Response.json({ error: "База данных недоступна" }, { status: 503 });
  }
}

/** POST /api/quiz — сохранить результат прохождения */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { topicSlug?: string; score?: number; total?: number; visitorId?: string } | null;
  const topic = body?.topicSlug ? getTopic(body.topicSlug) : undefined;
  const score = Number(body?.score);
  const total = Number(body?.total);

  if (!topic || !Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 100 || score < 0 || score > total) {
    return Response.json({ error: "Некорректные данные" }, { status: 400 });
  }
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.slice(0, 64) : null;

  try {
    await db.insert(quizAttempts).values({ topicSlug: topic.slug, score, total, visitorId });
    return Response.json(await statsFor(topic.slug), { status: 201 });
  } catch {
    return Response.json({ error: "База данных недоступна" }, { status: 503 });
  }
}
