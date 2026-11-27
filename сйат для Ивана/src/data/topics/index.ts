import type { Topic, TopicSummary } from "../types";
import { enrichTopic } from "../photos";
import { topic01 } from "./topic-01-vossoedinenie";
import { topic02 } from "./topic-02-nachalo-voyny";
import { topic03 } from "./topic-03-okkupatsiya";
import { topic04 } from "./topic-04-partizany";
import { topic05 } from "./topic-05-podpolye";
import { topic06 } from "./topic-06-nachalo-osvobozhdeniya";
import { topic07 } from "./topic-07-bagration";
import { topic08 } from "./topic-08-vklad-oon";

/**
 * Реестр тем. Чтобы добавить новую тему:
 * 1) создайте файл topic-XX-slug.ts, экспортирующий объект Topic;
 * 2) импортируйте его здесь и добавьте в массив в нужном порядке.
 */
export const topics: Topic[] = [topic01, topic02, topic03, topic04, topic05, topic06, topic07, topic08].map(enrichTopic);

export function getTopic(slug: string): Topic | undefined {
  return topics.find((t) => t.slug === slug);
}

export function getAdjacentTopics(slug: string): { prev?: Topic; next?: Topic } {
  const index = topics.findIndex((t) => t.slug === slug);
  if (index === -1) return {};
  return {
    prev: index > 0 ? topics[index - 1] : undefined,
    next: index < topics.length - 1 ? topics[index + 1] : undefined,
  };
}

export function getTopicSummaries(): TopicSummary[] {
  return topics.map((t) => ({
    number: t.number,
    slug: t.slug,
    paragraph: t.paragraph,
    title: t.title,
    shortTitle: t.shortTitle,
    period: t.period,
    annotation: t.annotation,
    cover: t.cover,
    coverFallbacks: t.coverFallbacks,
    tags: t.tags,
    quizCount: t.quiz.length,
  }));
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  topics.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
  return Array.from(set);
}

/** Текст темы для передачи в ИИ (используется в /api/summary) */
export function topicToPlainText(topic: Topic): string {
  const parts: string[] = [`Тема: ${topic.title}. Период: ${topic.period}.`];
  topic.intro.forEach((section) => {
    parts.push(`\n## ${section.heading}\n${section.paragraphs.join("\n")}`);
  });
  parts.push("\n## Хронология");
  topic.timeline.forEach((e) => parts.push(`- ${e.date}: ${e.title}. ${e.description}`));
  parts.push("\n## Личности");
  topic.persons.forEach((p) => parts.push(`- ${p.name} (${p.role}): ${p.description}`));
  return parts.join("\n");
}
