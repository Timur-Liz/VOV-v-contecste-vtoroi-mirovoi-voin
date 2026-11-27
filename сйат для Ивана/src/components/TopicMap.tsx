"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { LatLngBounds, Map as LeafletMap, Marker, TileLayer } from "leaflet";
import type { PointKind, Topic } from "@/data/types";
import { useAsset } from "@/lib/useAsset";
import { FOCUS_POINT_EVENT } from "./topicSections";

/* ------------------------------------------------------------------ */
/*  Настройки                                                          */
/* ------------------------------------------------------------------ */

const KIND_COLORS: Record<PointKind, string> = {
  battle: "#7a1f2b",
  city: "#1f3d2b",
  memorial: "#b8921f",
  camp: "#3d3a36",
  event: "#2f5c42",
  partisan: "#4f6d2f",
};

const KIND_LABELS: Record<PointKind, string> = {
  battle: "Бои, операции",
  city: "Город, населённый пункт",
  memorial: "Мемориал, память",
  camp: "Лагерь смерти, место трагедии",
  event: "Событие",
  partisan: "Партизаны, подполье",
};

/** Онлайн-подложки: пробуем по очереди, при недоступности остаётся векторная схема */
const TILE_PROVIDERS = [
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© участники OpenStreetMap",
    options: { maxZoom: 19 },
  },
  {
    name: "CARTO",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CARTO",
    options: { subdomains: "abcd", maxZoom: 18 },
  },
];

const TILES_KEY = "vov_map_tiles";

/**
 * Подписи соседних государств (схематично).
 * Четвёртый элемент — подпись у самого края карты: на мелком масштабе (телефон) она скрывается,
 * чтобы не обрезаться рамкой.
 */
const NEIGHBOURS: [string, number, number, boolean?][] = [
  ["Литва", 55.15, 24.25],
  ["Латвия", 56.5, 27.0],
  ["Россия", 55.95, 31.7],
  ["Украина", 51.15, 29.3],
  ["Польша", 52.6, 22.45, true],
];

const OBLAST_RU: Record<string, string> = {
  Gomel: "Гомельская обл.",
  Vitebsk: "Витебская обл.",
  Grodno: "Гродненская обл.",
  Brest: "Брестская обл.",
  Mogilev: "Могилёвская обл.",
  Minsk: "Минская обл.",
};

const RIVER_LABELS: [string, number, number][] = [
  ["Днепр", 53.6, 30.6],
  ["Западная Двина", 55.6, 27.95],
  ["Припять", 52.05, 27.8],
  ["Нёман", 53.8, 25.0],
  ["Западный Буг", 52.5, 23.35],
  ["Вилия", 54.5, 26.6],
];

type TileState = "off" | "loading" | "on" | "failed";

/** Отступы при вписывании карты: на узких экранах меньше */
function fitPadding(el: HTMLElement): [number, number] {
  return el.clientWidth < 520 ? [10, 10] : [28, 28];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}

/* ------------------------------------------------------------------ */
/*  Компонент                                                          */
/* ------------------------------------------------------------------ */

interface TopicMapProps {
  map: Topic["map"];
}

/**
 * Интерактивная карта событий темы (Leaflet).
 * Базовая подложка — векторная схема Беларуси (границы областей, реки), которая
 * работает без интернета. Онлайн-тайлы включаются кнопкой и подключаются с
 * автоматическим переключением провайдера при ошибках.
 */
export default function TopicMap({ map }: TopicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const boundsRef = useRef<LatLngBounds | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const tilesWantedRef = useRef(false);

  const resolveAsset = useAsset();
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** Сенсорный экран: по умолчанию карта двигается двумя пальцами, чтобы не мешать прокрутке страницы */
  const [touch, setTouch] = useState(false);
  const [oneFinger, setOneFinger] = useState(false);
  const [tiles, setTiles] = useState<TileState>("off");
  const [tileName, setTileName] = useState("");

  const removeTiles = useCallback(() => {
    tileLayerRef.current?.remove();
    tileLayerRef.current = null;
  }, []);

  /** Подключение онлайн-подложки с перебором провайдеров */
  const enableTiles = useCallback(
    async (providerIndex: number) => {
      const m = mapRef.current;
      if (!m || !tilesWantedRef.current) return;
      const provider = TILE_PROVIDERS[providerIndex];
      if (!provider) {
        setTiles("failed");
        return;
      }
      const L = (await import("leaflet")).default;
      removeTiles();
      setTiles("loading");
      setTileName(provider.name);

      let loaded = false;
      let errors = 0;
      let settled = false;
      const layer = L.tileLayer(provider.url, { attribution: provider.attribution, ...provider.options });

      const fail = () => {
        if (settled) return;
        settled = true;
        layer.remove();
        if (tileLayerRef.current === layer) tileLayerRef.current = null;
        if (tilesWantedRef.current) void enableTiles(providerIndex + 1);
      };

      layer.on("tileload", () => {
        if (!loaded) {
          loaded = true;
          settled = true;
          setTiles("on");
        }
      });
      layer.on("tileerror", () => {
        errors += 1;
        if (!loaded && errors >= 3) fail();
      });
      window.setTimeout(() => {
        if (!loaded) fail();
      }, 8000);

      layer.addTo(m);
      tileLayerRef.current = layer;
    },
    [removeTiles],
  );

  const toggleTiles = () => {
    if (tiles === "off" || tiles === "failed") {
      tilesWantedRef.current = true;
      try {
        window.localStorage.setItem(TILES_KEY, "1");
      } catch {
        /* ignore */
      }
      void enableTiles(0);
    } else {
      tilesWantedRef.current = false;
      try {
        window.localStorage.setItem(TILES_KEY, "0");
      } catch {
        /* ignore */
      }
      removeTiles();
      setTiles("off");
    }
  };

  /* ---------- Инициализация карты ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const el = containerRef.current;
      const isTouch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
      setTouch(isTouch);

      const m = L.map(el, {
        center: map.center,
        zoom: map.zoom,
        scrollWheelZoom: false,
        attributionControl: false,
        zoomSnap: 0.5,
        // На телефоне один палец прокручивает страницу, два — двигают и масштабируют карту
        dragging: !isTouch,
      });

      // Подписи областей и рек скрываются на мелком масштабе, чтобы не слипаться с метками
      const updateZoomClass = () => el.classList.toggle("vov-zoom-low", m.getZoom() < 6);
      m.on("zoomend", updateZoomClass);

      // Карта подстраивается под изменение размеров блока (поворот экрана, смена ширины окна)
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => m.invalidateSize());
        ro.observe(el);
        m.on("unload", () => ro.disconnect());
      }

      let countryBounds: LatLngBounds | null = null;
      // Атрибуция без стандартного префикса Leaflet
      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(m);
      m.attributionControl.addAttribution("Границы: geoBoundaries · Реки: Natural Earth");

      const basePane = m.createPane("vovBase");
      basePane.style.zIndex = "150";
      basePane.style.pointerEvents = "none";
      const labelPane = m.createPane("vovLabels");
      labelPane.style.zIndex = "160";
      labelPane.style.pointerEvents = "none";

      mapRef.current = m;

      // --- Векторная схема (работает офлайн) ---
      try {
        const [adm1, adm0, rivers] = (await Promise.all(
          ["/geo/belarus-adm1.geojson", "/geo/belarus-adm0.geojson", "/geo/rivers.geojson"].map((u) => fetch(resolveAsset(u)).then((r) => r.json())),
        )) as [FeatureCollection, FeatureCollection, FeatureCollection];
        if (cancelled) return;

        L.geoJSON(adm1, { pane: "vovBase", interactive: false, style: { className: "vov-oblast", weight: 1 } }).addTo(m);
        L.geoJSON(rivers, { pane: "vovBase", interactive: false, style: { className: "vov-river", weight: 1.5 } }).addTo(m);
        // Внешняя граница — в слое над тайлами, чтобы была видна и при онлайн-подложке
        const countryLayer = L.geoJSON(adm0, { interactive: false, style: { className: "vov-country", weight: 2 } }).addTo(m);
        countryBounds = countryLayer.getBounds();

        const label = (text: string, lat: number, lng: number, cls: string) =>
          L.marker([lat, lng], {
            pane: "vovLabels",
            interactive: false,
            keyboard: false,
            icon: L.divIcon({ className: "vov-map-label-wrap", html: `<span class="vov-map-label ${cls}">${escapeHtml(text)}</span>`, iconSize: [0, 0] }),
          }).addTo(m);

        (adm1.features as Feature[]).forEach((f) => {
          const name = OBLAST_RU[(f.properties as { name?: string } | null)?.name ?? ""];
          if (!name) return;
          const c = L.geoJSON(f).getBounds().getCenter();
          label(name, c.lat, c.lng, "vov-map-label--oblast");
        });
        NEIGHBOURS.forEach(([n, lat, lng, edge]) => label(n, lat, lng, `vov-map-label--country${edge ? " vov-map-label--edge" : ""}`));
        RIVER_LABELS.forEach(([n, lat, lng]) => label(n, lat, lng, "vov-map-label--river"));
      } catch {
        /* схема недоступна — остаются маркеры и линии */
      }

      // --- Линии (фронт, направления ударов) ---
      map.lines?.forEach((line) => {
        L.polyline(line.points, {
          color: line.color ?? "#7a1f2b",
          weight: 3,
          opacity: 0.85,
          dashArray: line.dashed ? "8 8" : undefined,
        })
          .bindTooltip(line.title, { sticky: true })
          .addTo(m);
      });

      // --- Маркеры событий ---
      map.points.forEach((p, i) => {
        const color = KIND_COLORS[p.kind ?? "event"];
        const icon = L.divIcon({
          className: "",
          html: `<div class="vov-marker" style="background:${color}"><span>${i + 1}</span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });
        const marker = L.marker([p.lat, p.lng], { icon, title: p.title, alt: p.title }).addTo(m);
        marker.bindPopup(
          `<h4>${escapeHtml(p.title)}</h4>` +
            (p.date ? `<div class="popup-date">${escapeHtml(p.date)}</div>` : "") +
            `<p>${escapeHtml(p.description)}</p>` +
            (p.approximate ? `<p style="opacity:.7;font-size:.8em;margin-top:6px">Положение показано приблизительно</p>` : ""),
          { maxWidth: 320 },
        );
        marker.on("click", () => setActive(p.id));
        markersRef.current[p.id] = marker;
      });

      // Показываем всю Беларусь и все точки темы (в том числе за её пределами)
      const bounds = L.latLngBounds(map.points.map((p) => [p.lat, p.lng] as [number, number]));
      if (countryBounds) bounds.extend(countryBounds);
      if (bounds.isValid()) {
        boundsRef.current = bounds;
        m.fitBounds(bounds, { padding: fitPadding(el), maxZoom: 8 });
      }
      updateZoomClass();

      setReady(true);

      // Восстанавливаем выбор пользователя: онлайн-подложка
      try {
        if (window.localStorage.getItem(TILES_KEY) === "1") {
          tilesWantedRef.current = true;
          void enableTiles(0);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      tilesWantedRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        tileLayerRef.current = null;
      }
    };
  }, [map, enableTiles, resolveAsset]);

  /* ---------- Фокус на точке ---------- */
  const focusPoint = useCallback((id: string) => {
    const m = mapRef.current;
    const marker = markersRef.current[id];
    if (!m || !marker) return;
    setActive(id);
    Object.values(markersRef.current).forEach((mk) => mk.getElement()?.querySelector(".vov-marker")?.classList.remove("is-active"));
    marker.getElement()?.querySelector(".vov-marker")?.classList.add("is-active");
    m.flyTo(marker.getLatLng(), Math.max(m.getZoom(), 9), { duration: 0.8 });
    window.setTimeout(() => marker.openPopup(), 850);
  }, []);

  const resetView = () => {
    const m = mapRef.current;
    if (!m) return;
    m.closePopup();
    if (boundsRef.current) m.fitBounds(boundsRef.current, { padding: fitPadding(m.getContainer()), maxZoom: 8 });
    else m.setView(map.center, map.zoom);
  };

  /** Сенсорные экраны: разрешить/запретить перемещение карты одним пальцем */
  const toggleOneFinger = () => {
    const m = mapRef.current;
    if (!m) return;
    if (oneFinger) m.dragging.disable();
    else m.dragging.enable();
    setOneFinger(!oneFinger);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => focusPoint(id), 400);
    };
    window.addEventListener(FOCUS_POINT_EVENT, handler);
    return () => window.removeEventListener(FOCUS_POINT_EVENT, handler);
  }, [focusPoint]);

  const kindsUsed = Array.from(new Set(map.points.map((p) => p.kind ?? "event"))) as PointKind[];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" data-widget="map">
      <div>
        <div className="map-frame" ref={containerRef} role="region" aria-label="Интерактивная карта событий темы">
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-muted text-sm" aria-hidden="true">
              Загрузка карты…
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted" data-map-footer="">
          <span className="max-w-md leading-snug">
            На схеме — современные области Беларуси (для ориентира) и основные реки.
            {touch && !oneFinger && " Двигайте и масштабируйте карту двумя пальцами — один палец прокручивает страницу."}
            {tiles === "failed" && " Онлайн-подложка недоступна — показана схема."}
          </span>
          <div className="flex flex-wrap gap-2">
            {touch && (
              <button type="button" className={`btn btn-sm ${oneFinger ? "btn-primary" : "btn-ghost"}`} onClick={toggleOneFinger} aria-pressed={oneFinger}>
                {oneFinger ? "Одним пальцем ✓" : "Двигать одним пальцем"}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetView}>
              Сбросить вид
            </button>
            <button type="button" className={`btn btn-sm ${tiles === "on" ? "btn-primary" : "btn-ghost"}`} onClick={toggleTiles} aria-pressed={tiles === "on"}>
              {tiles === "loading" ? "Загрузка подложки…" : tiles === "on" ? `Онлайн-карта: ${tileName} ✓` : "Включить онлайн-карту"}
            </button>
          </div>
        </div>
      </div>

      <aside className="card p-3 flex flex-col max-h-[320px] lg:max-h-[560px]">
        <div className="px-2 pt-1 pb-2 text-xs font-bold uppercase tracking-wider text-muted">Точки на карте · {map.points.length}</div>
        <ol className="map-points overflow-y-auto pr-1" aria-label="Список точек на карте">
          {map.points.map((p, i) => (
            <li key={p.id}>
              <button type="button" className={`map-point-btn ${active === p.id ? "is-active" : ""}`} onClick={() => focusPoint(p.id)}>
                <span className="map-point-index" style={{ background: KIND_COLORS[p.kind ?? "event"] }}>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-sm leading-tight">{p.title}</span>
                  {p.date && <span className="block text-xs text-wine font-semibold mt-0.5">{p.date}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-3 border-t border-line pt-3 px-2 flex flex-wrap gap-x-3 gap-y-1">
          {kindsUsed.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLORS[k] }} />
              {KIND_LABELS[k]}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
