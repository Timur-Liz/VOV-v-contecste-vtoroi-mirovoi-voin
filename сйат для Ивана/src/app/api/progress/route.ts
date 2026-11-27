import { eq } from "drizzle-orm";
import { db } from "@/db";
import { topicProgress } from "@/db/schema";
import { getTopic } from "@/data/topics";

export const dynamic = "force-dynamic";

/** GET /api/progress?visitorId=... — прогресс посетителя */
export async function GET(req: Request) {
  const visitorId = new URL(req.url).searchParams.get("visitorId");
  if (!visitorId || visitorId.length > 64) return Response.json({ error: "visitorId обязателен" }, { status: 400 });
  try {
    const rows = await db.select().from(topicProgress).where(eq(topicProgress.visitorId, visitorId));
    return Response.json({
      items: rows.map((r) => ({
        topicSlug: r.topicSlug,
        completed: r.completed,
        bestScore: r.bestScore,
        bestTotal: r.bestTotal,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "База данных недоступна" }, { status: 503 });
  }
}

/** POST /api/progress — сохранить/обновить прогресс по теме */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    visitorId?: string;
    topicSlug?: string;
    completed?: boolean;
    bestScore?: number | null;
    bestTotal?: number | null;
  } | null;

  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.slice(0, 64) : "";
  const topic = body?.topicSlug ? getTopic(body.topicSlug) : undefined;
  if (!visitorId || !topic) return Response.json({ error: "Некорректные данные" }, { status: 400 });

  const completed = Boolean(body?.completed);
  const bestScore = Number.isInteger(body?.bestScore) ? (body?.bestScore as number) : null;
  const bestTotal = Number.isInteger(body?.bestTotal) ? (body?.bestTotal as number) : null;

  try {
    await db
      .insert(topicProgress)
      .values({ visitorId, topicSlug: topic.slug, completed, bestScore, bestTotal })
      .onConflictDoUpdate({
        target: [topicProgress.visitorId, topicProgress.topicSlug],
        set: { completed, bestScore, bestTotal, updatedAt: new Date() },
      });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "База данных недоступна" }, { status: 503 });
  }
}
