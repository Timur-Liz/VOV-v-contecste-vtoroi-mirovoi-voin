"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { asset } from "./paths";

/**
 * Хук для клиентских компонентов: возвращает функцию, превращающую «/images/…»
 * в правильный относительный путь для текущей страницы (глубина берётся из адреса).
 */
export function useAsset(): (path: string) => string {
  const pathname = usePathname() ?? "/";
  const depth = pathname.split("/").filter(Boolean).length;
  return useCallback((path: string) => asset(path, depth), [depth]);
}
