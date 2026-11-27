/*!
 * Великая Отечественная война в истории Беларуси — автономная версия сайта.
 *
 * Весь интерактив сайта на чистом JavaScript: без React, без сборки и без сервера.
 * Работает при открытии index.html двойным щелчком (file://), в Live Server
 * и на GitHub Pages в любой подпапке.
 *
 * Что подключается на странице (см. конец любого index.html):
 *   assets/data/geo.js          — границы Беларуси и реки (window.VOV_GEO)
 *   assets/data/topic-XX-….js   — данные темы: карта, конспект, викторина (window.VOV_TOPIC)
 *   assets/vendor/leaflet.js    — библиотека карт
 *   assets/js/site.js           — этот файл
 *
 * Разделы файла: помощники → прогресс → тема оформления → появление блоков →
 * изображения → хаб → шапка темы → карта → конспект → викторина → галерея.
 */
(function () {
  "use strict";

  /* =====================================================================
     Помощники
     ===================================================================== */

  /** Путь от текущей страницы до корня сайта: "./" или "../../" (задан в <html data-root>) */
  var ROOT = document.documentElement.getAttribute("data-root") || "./";

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /** Экранирование текста перед вставкой в HTML */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /** «/images/…» из данных → путь к файлу в папке public/ относительно текущей страницы */
  function asset(path) {
    if (/^(https?:)?\/\//.test(path) || path.indexOf("data:") === 0) return path;
    return ROOT + "public/" + path.replace(/^\/+/, "");
  }

  /** Хранилище: localStorage, а если он недоступен — память страницы */
  var memory = {};
  var store = {
    get: function (key) {
      try {
        var v = window.localStorage.getItem(key);
        if (v !== null) return v;
      } catch (e) {
        /* localStorage недоступен */
      }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    set: function (key, value) {
      memory[key] = value;
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        /* localStorage недоступен */
      }
    },
  };

  /** Запуск раздела так, чтобы ошибка в одном не ломала остальные */
  function safely(name, fn) {
    try {
      fn();
    } catch (e) {
      if (window.console) console.error("[site.js] " + name + ":", e);
    }
  }

  /* =====================================================================
     Прогресс изучения тем (хранится в браузере)
     ===================================================================== */

  var PROGRESS_KEY = "vov_progress_v1";
  var PROGRESS_EVENT = "vov:progress";

  function readProgress() {
    try {
      return JSON.parse(store.get(PROGRESS_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeProgress(map) {
    store.set(PROGRESS_KEY, JSON.stringify(map));
    document.dispatchEvent(new Event(PROGRESS_EVENT));
  }

  /** Отметить тему изученной и/или сохранить лучший результат викторины */
  function markTopic(slug, patch) {
    var map = readProgress();
    var prev = map[slug] || { completed: false };
    var next = { completed: !!prev.completed, bestScore: prev.bestScore, bestTotal: prev.bestTotal, updatedAt: new Date().toISOString() };
    if (patch.completed !== undefined) next.completed = !!patch.completed;
    if (patch.score !== undefined && patch.total) {
      var prevPct = prev.bestTotal ? (prev.bestScore || 0) / prev.bestTotal : -1;
      if (patch.score / patch.total > prevPct) {
        next.bestScore = patch.score;
        next.bestTotal = patch.total;
      }
    }
    map[slug] = next;
    writeProgress(map);
    return map;
  }

  /* =====================================================================
     Тема оформления (светлая / тёмная)
     ===================================================================== */

  var ICON_MOON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var ICON_SUN =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

  function initTheme() {
    var buttons = $$("[data-theme-toggle]");
    var current = function () {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    };
    var paint = function () {
      var dark = current() === "dark";
      buttons.forEach(function (btn) {
        btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
        btn.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
        btn.setAttribute("title", dark ? "Светлая тема" : "Тёмная тема");
      });
    };
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        store.set("vov_theme", next);
        paint();
      });
    });
    paint();
  }

  /* =====================================================================
     Плавное появление блоков при прокрутке и кнопка «Наверх»
     ===================================================================== */

  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) return; // без анимации всё и так видно
    document.documentElement.classList.add("js-anim");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function initBackToTop() {
    var btn = $(".to-top");
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* =====================================================================
     Изображения: запасные источники
     Если локальный файл не загрузился, пробуем источники из data-fallbacks
     (например, оригинал на Wikimedia Commons). Если не помогло — прячем
     картинку, а для портретов показываем инициалы.
     ===================================================================== */

  function initials(name) {
    var parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
    var first = parts[0] ? parts[0][0] : "";
    var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function onImageBroken(img) {
    var mode = img.getAttribute("data-broken") || "hide";
    var figure = img.closest("figure");
    if (mode === "initials") {
      var name = (img.getAttribute("alt") || "").replace(/^Портрет:\s*/, "");
      var div = document.createElement("div");
      div.className = "person-initials person-initials--fill";
      div.style.background = "var(--green)";
      div.setAttribute("aria-hidden", "true");
      div.textContent = initials(name);
      img.replaceWith(div);
      return;
    }
    if (figure && figure.closest('[data-widget="gallery"]')) {
      // карточка галереи без изображения скрывается целиком
      var wrapper = figure.parentElement && figure.parentElement.classList.contains("reveal") ? figure.parentElement : figure;
      wrapper.style.display = "none";
      figure.setAttribute("data-broken-item", "1");
      return;
    }
    img.style.display = "none"; // под обложками и героем остаётся градиентный фон
  }

  function initImages() {
    $$("img").forEach(function (img) {
      var list = [];
      try {
        list = JSON.parse(img.getAttribute("data-fallbacks") || "[]").map(asset);
      } catch (e) {
        list = [];
      }
      var i = 0;
      var onFail = function () {
        if (i < list.length) {
          img.src = list[i++];
        } else {
          img.removeEventListener("error", onFail);
          onImageBroken(img);
        }
      };
      img.addEventListener("error", onFail);
      // картинка могла «сломаться» ещё до запуска скрипта
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) onFail();
    });
  }

  /* =====================================================================
     Хаб (главная страница): прогресс, поиск, фильтр по тегам
     ===================================================================== */

  function initHub() {
    var list = $('ul[aria-label="Список тем"]');
    if (!list) return;

    var items = $$("li", list)
      .filter(function (li) {
        return li.parentElement === list;
      })
      .map(function (li) {
        var link = $('a[href*="topics/"]', li);
        var match = link ? /topics\/([^/]+)\//.exec(link.getAttribute("href")) : null;
        var quizEl = $("[data-hub-quiz]", li);
        return {
          li: li,
          slug: match ? match[1] : "",
          tags: $$(".chip-xs", li).map(function (c) {
            return c.textContent.trim();
          }),
          text: li.textContent.toLowerCase(),
          cover: $(".topic-card__cover", li),
          quizEl: quizEl,
          quizDefault: quizEl ? quizEl.textContent : "",
        };
      });

    var countEl = $("[data-hub-count]");
    var percentEl = $("[data-hub-percent]");
    var actionsEl = $("[data-hub-actions]");
    var fillEl = $("#topics .progress-fill");
    var trackEl = $("#topics .progress-track");
    var search = $('#topics input[type="search"]');
    var tagButtons = $$("#topics .chips-scroll button");
    var query = "";
    var tag = null;

    // Блок «ничего не найдено»
    var empty = document.createElement("div");
    empty.className = "mt-10 rounded-3xl border border-dashed border-line p-10 text-center text-muted";
    empty.hidden = true;
    list.insertAdjacentElement("afterend", empty);

    // Кнопка «Сбросить» прогресс
    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-ghost btn-sm";
    resetBtn.textContent = "Сбросить";
    resetBtn.hidden = true;
    resetBtn.addEventListener("click", function () {
      writeProgress({});
    });
    if (actionsEl) actionsEl.appendChild(resetBtn);

    function paintProgress() {
      var progress = readProgress();
      var done = 0;
      items.forEach(function (it) {
        var entry = progress[it.slug];
        var completed = !!(entry && entry.completed);
        if (completed) done += 1;
        var badge = it.cover ? $("[data-done-badge]", it.cover) : null;
        if (completed && it.cover && !badge) {
          badge = document.createElement("span");
          badge.className = "absolute right-3 top-3 chip chip-green shadow";
          badge.setAttribute("data-done-badge", "");
          badge.textContent = "✓ Изучено";
          it.cover.appendChild(badge);
        } else if (!completed && badge) {
          badge.remove();
        }
        if (it.quizEl) it.quizEl.textContent = entry && entry.bestTotal ? "Викторина: " + entry.bestScore + "/" + entry.bestTotal : it.quizDefault;
      });
      var percent = items.length ? Math.round((done / items.length) * 100) : 0;
      if (countEl) countEl.textContent = String(done);
      if (percentEl) percentEl.textContent = percent + "%";
      if (fillEl) fillEl.style.width = percent + "%";
      if (trackEl) trackEl.setAttribute("aria-valuenow", String(done));
      resetBtn.hidden = done === 0;
    }

    function applyFilter() {
      var q = query.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it) {
        var ok = (!tag || it.tags.indexOf(tag) !== -1) && (!q || it.text.indexOf(q) !== -1);
        it.li.hidden = !ok;
        if (ok) shown += 1;
      });
      list.hidden = shown === 0;
      empty.hidden = shown !== 0;
      if (shown === 0) empty.textContent = (q ? "По запросу «" + query.trim() + "» ничего не найдено." : "В этой категории тем нет.") + " Попробуйте другое слово или снимите фильтр.";
      tagButtons.forEach(function (btn, i) {
        var active = i === 0 ? tag === null : btn.textContent.trim() === tag;
        btn.classList.toggle("is-active", active);
      });
    }

    if (search) {
      search.addEventListener("input", function () {
        query = search.value;
        applyFilter();
      });
    }
    tagButtons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var value = btn.textContent.trim();
        tag = i === 0 || tag === value ? null : value;
        applyFilter();
      });
    });

    document.addEventListener(PROGRESS_EVENT, paintProgress);
    window.addEventListener("pageshow", paintProgress); // возврат «назад» из темы
    paintProgress();
    applyFilter();
  }

  /* =====================================================================
     Страница темы: липкая шапка (активный раздел, индикатор чтения)
     ===================================================================== */

  function initTopicNav() {
    var nav = $(".topic-nav__links");
    if (!nav) return;
    var links = $$("a[data-section]", nav);
    var bar = $(".nav-progress");

    var setActive = function (id) {
      links.forEach(function (a) {
        var on = a.getAttribute("data-section") === id;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
        // активная ссылка подъезжает в центр ленты (прокручивается только сама лента)
        if (on && nav.scrollWidth > nav.clientWidth) {
          nav.scrollTo({ left: Math.max(0, a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2), behavior: "smooth" });
        }
      });
    };

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActive(entry.target.id);
          });
        },
        { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
      );
      links.forEach(function (a) {
        var section = document.getElementById(a.getAttribute("data-section"));
        if (section) io.observe(section);
      });
    }

    var onScroll = function () {
      if (!bar) return;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + "%";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* =====================================================================
     Кнопка «Отметить тему изученной»
     ===================================================================== */

  function initMarkStudied() {
    var root = $('[data-widget="mark"]');
    var topic = window.VOV_TOPIC;
    if (!root || !topic) return;

    function render() {
      var entry = readProgress()[topic.slug];
      var completed = !!(entry && entry.completed);
      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-3">' +
        '<button type="button" class="btn ' + (completed ? "btn-ghost" : "btn-primary") + '" aria-pressed="' + completed + '">' +
        (completed ? "✓ Тема изучена" : "Отметить тему изученной") +
        "</button>" +
        (entry && entry.bestTotal
          ? '<span class="chip chip-green">Лучший результат викторины: ' + entry.bestScore + "/" + entry.bestTotal + "</span>"
          : '<span class="text-xs text-muted">Пройдите викторину — тема отметится автоматически.</span>') +
        "</div>";
    }

    root.addEventListener("click", function (e) {
      if (!e.target.closest("button")) return;
      var entry = readProgress()[topic.slug];
      markTopic(topic.slug, { completed: !(entry && entry.completed) });
    });
    document.addEventListener(PROGRESS_EVENT, render);
    render();
  }

  /* =====================================================================
     Интерактивная карта (Leaflet)
     Базовая подложка — векторная схема Беларуси из assets/data/geo.js,
     она работает без интернета. Онлайн-карта включается кнопкой.
     ===================================================================== */

  var KIND_COLORS = { battle: "#7a1f2b", city: "#1f3d2b", memorial: "#b8921f", camp: "#3d3a36", event: "#2f5c42", partisan: "#4f6d2f" };

  var TILE_PROVIDERS = [
    { name: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© участники OpenStreetMap", options: { maxZoom: 19 } },
    { name: "CARTO", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: "© OpenStreetMap, © CARTO", options: { subdomains: "abcd", maxZoom: 18 } },
  ];

  // [подпись, широта, долгота, скрывать на мелком масштабе]
  var NEIGHBOURS = [
    ["Литва", 55.15, 24.25],
    ["Латвия", 56.5, 27.0],
    ["Россия", 55.95, 31.7],
    ["Украина", 51.15, 29.3],
    ["Польша", 52.6, 22.45, true],
  ];
  var OBLAST_RU = { Gomel: "Гомельская обл.", Vitebsk: "Витебская обл.", Grodno: "Гродненская обл.", Brest: "Брестская обл.", Mogilev: "Могилёвская обл.", Minsk: "Минская обл." };
  var RIVER_LABELS = [
    ["Днепр", 53.6, 30.6],
    ["Западная Двина", 55.6, 27.95],
    ["Припять", 52.05, 27.8],
    ["Нёман", 53.8, 25.0],
    ["Западный Буг", 52.5, 23.35],
    ["Вилия", 54.5, 26.6],
  ];

  function initMap() {
    var root = $('[data-widget="map"]');
    var topic = window.VOV_TOPIC;
    if (!root || !topic || !topic.map) return;

    var frame = $(".map-frame", root);
    var footer = $("[data-map-footer]", root);
    var listButtons = $$(".map-point-btn", root);
    var data = topic.map;
    var L = window.L;

    if (!L) {
      frame.innerHTML =
        '<div class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">Карта не загрузилась: не найден файл assets/vendor/leaflet.js. Убедитесь, что папка assets лежит рядом с index.html.</div>';
      return;
    }
    frame.innerHTML = "";

    var isTouch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var state = { tiles: "off", tileName: "", wanted: false, layer: null, oneFinger: false };
    var markers = {};
    var fitPadding = function () {
      return frame.clientWidth < 520 ? [10, 10] : [28, 28];
    };

    var map = L.map(frame, {
      center: data.center,
      zoom: data.zoom,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomSnap: 0.5,
      dragging: !isTouch, // на телефоне один палец прокручивает страницу, два — двигают карту
    });
    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);
    map.attributionControl.addAttribution("Границы: geoBoundaries · Реки: Natural Earth");

    var basePane = map.createPane("vovBase");
    basePane.style.zIndex = "150";
    basePane.style.pointerEvents = "none";
    var labelPane = map.createPane("vovLabels");
    labelPane.style.zIndex = "160";
    labelPane.style.pointerEvents = "none";

    // Подписи областей и рек скрываются на мелком масштабе
    var updateZoomClass = function () {
      frame.classList.toggle("vov-zoom-low", map.getZoom() < 6);
    };
    map.on("zoomend", updateZoomClass);
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        map.invalidateSize();
      }).observe(frame);
    }

    // --- Векторная схема: области, реки, граница, подписи ---
    var bounds = L.latLngBounds(
      data.points.map(function (p) {
        return [p.lat, p.lng];
      })
    );
    var geo = window.VOV_GEO;
    if (geo) {
      L.geoJSON(geo.adm1, { pane: "vovBase", interactive: false, style: { className: "vov-oblast", weight: 1 } }).addTo(map);
      L.geoJSON(geo.rivers, { pane: "vovBase", interactive: false, style: { className: "vov-river", weight: 1.5 } }).addTo(map);
      var country = L.geoJSON(geo.adm0, { interactive: false, style: { className: "vov-country", weight: 2 } }).addTo(map);
      bounds.extend(country.getBounds());

      var label = function (text, lat, lng, cls) {
        L.marker([lat, lng], {
          pane: "vovLabels",
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: "vov-map-label-wrap", html: '<span class="vov-map-label ' + cls + '">' + esc(text) + "</span>", iconSize: [0, 0] }),
        }).addTo(map);
      };
      geo.adm1.features.forEach(function (f) {
        var name = OBLAST_RU[(f.properties && f.properties.name) || ""];
        if (!name) return;
        var c = L.geoJSON(f).getBounds().getCenter();
        label(name, c.lat, c.lng, "vov-map-label--oblast");
      });
      NEIGHBOURS.forEach(function (n) {
        label(n[0], n[1], n[2], "vov-map-label--country" + (n[3] ? " vov-map-label--edge" : ""));
      });
      RIVER_LABELS.forEach(function (r) {
        label(r[0], r[1], r[2], "vov-map-label--river");
      });
    }

    // --- Линии фронта и направления ударов ---
    (data.lines || []).forEach(function (line) {
      L.polyline(line.points, { color: line.color || "#7a1f2b", weight: 3, opacity: 0.85, dashArray: line.dashed ? "8 8" : undefined })
        .bindTooltip(line.title, { sticky: true })
        .addTo(map);
    });

    // --- Метки событий ---
    data.points.forEach(function (p, i) {
      var icon = L.divIcon({
        className: "",
        html: '<div class="vov-marker" style="background:' + (KIND_COLORS[p.kind || "event"] || KIND_COLORS.event) + '"><span>' + (i + 1) + "</span></div>",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });
      var marker = L.marker([p.lat, p.lng], { icon: icon, title: p.title, alt: p.title }).addTo(map);
      marker.bindPopup(
        "<h4>" + esc(p.title) + "</h4>" +
          (p.date ? '<div class="popup-date">' + esc(p.date) + "</div>" : "") +
          "<p>" + esc(p.description) + "</p>" +
          (p.approximate ? '<p style="opacity:.7;font-size:.8em;margin-top:6px">Положение показано приблизительно</p>' : ""),
        { maxWidth: 320 }
      );
      marker.on("click", function () {
        setActive(p.id);
      });
      markers[p.id] = marker;
    });

    if (bounds.isValid()) map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 8 });
    updateZoomClass();

    function setActive(id) {
      data.points.forEach(function (p, i) {
        if (listButtons[i]) listButtons[i].classList.toggle("is-active", p.id === id);
        var el = markers[p.id] && markers[p.id].getElement();
        var pin = el && el.querySelector(".vov-marker");
        if (pin) pin.classList.toggle("is-active", p.id === id);
      });
    }

    function focusPoint(id) {
      var marker = markers[id];
      if (!marker) return;
      setActive(id);
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 9), { duration: 0.8 });
      window.setTimeout(function () {
        marker.openPopup();
      }, 850);
    }

    listButtons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        if (data.points[i]) focusPoint(data.points[i].id);
      });
    });

    // Кнопки «На карте» в хронологии
    $$("[data-point-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var section = document.getElementById("map");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(function () {
          focusPoint(btn.getAttribute("data-point-id"));
        }, 400);
      });
    });

    // --- Онлайн-подложка с перебором провайдеров ---
    function removeTiles() {
      if (state.layer) state.layer.remove();
      state.layer = null;
    }

    function enableTiles(index) {
      if (!state.wanted) return;
      var provider = TILE_PROVIDERS[index];
      if (!provider) {
        state.tiles = "failed";
        renderFooter();
        return;
      }
      removeTiles();
      state.tiles = "loading";
      state.tileName = provider.name;
      renderFooter();

      var loaded = false;
      var errors = 0;
      var settled = false;
      var options = { attribution: provider.attribution };
      Object.keys(provider.options).forEach(function (k) {
        options[k] = provider.options[k];
      });
      var layer = L.tileLayer(provider.url, options);
      var fail = function () {
        if (settled) return;
        settled = true;
        layer.remove();
        if (state.layer === layer) state.layer = null;
        enableTiles(index + 1);
      };
      layer.on("tileload", function () {
        if (loaded) return;
        loaded = true;
        settled = true;
        state.tiles = "on";
        renderFooter();
      });
      layer.on("tileerror", function () {
        errors += 1;
        if (!loaded && errors >= 3) fail();
      });
      window.setTimeout(function () {
        if (!loaded) fail();
      }, 8000);
      layer.addTo(map);
      state.layer = layer;
    }

    // --- Подсказка и кнопки под картой ---
    function renderFooter() {
      if (!footer) return;
      var tilesLabel = state.tiles === "loading" ? "Загрузка подложки…" : state.tiles === "on" ? "Онлайн-карта: " + esc(state.tileName) + " ✓" : "Включить онлайн-карту";
      footer.innerHTML =
        '<span class="max-w-md leading-snug">На схеме — современные области Беларуси (для ориентира) и основные реки.' +
        (isTouch && !state.oneFinger ? " Двигайте и масштабируйте карту двумя пальцами — один палец прокручивает страницу." : "") +
        (state.tiles === "failed" ? " Онлайн-подложка недоступна — показана схема." : "") +
        "</span>" +
        '<div class="flex flex-wrap gap-2">' +
        (isTouch
          ? '<button type="button" class="btn btn-sm ' + (state.oneFinger ? "btn-primary" : "btn-ghost") + '" data-map-act="finger" aria-pressed="' + state.oneFinger + '">' +
            (state.oneFinger ? "Одним пальцем ✓" : "Двигать одним пальцем") +
            "</button>"
          : "") +
        '<button type="button" class="btn btn-ghost btn-sm" data-map-act="reset">Сбросить вид</button>' +
        '<button type="button" class="btn btn-sm ' + (state.tiles === "on" ? "btn-primary" : "btn-ghost") + '" data-map-act="tiles" aria-pressed="' + (state.tiles === "on") + '">' +
        tilesLabel +
        "</button></div>";
    }

    if (footer) {
      footer.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-map-act]");
        if (!btn) return;
        var act = btn.getAttribute("data-map-act");
        if (act === "reset") {
          map.closePopup();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 8 });
        } else if (act === "finger") {
          state.oneFinger = !state.oneFinger;
          if (state.oneFinger) map.dragging.enable();
          else map.dragging.disable();
          renderFooter();
        } else if (act === "tiles") {
          if (state.tiles === "off" || state.tiles === "failed") {
            state.wanted = true;
            store.set("vov_map_tiles", "1");
            enableTiles(0);
          } else {
            state.wanted = false;
            store.set("vov_map_tiles", "0");
            removeTiles();
            state.tiles = "off";
            renderFooter();
          }
        }
      });
    }
    renderFooter();

    // Восстанавливаем выбор пользователя
    if (store.get("vov_map_tiles") === "1") {
      state.wanted = true;
      enableTiles(0);
    }
  }

  /* =====================================================================
     Конспект темы: три объёма, «сократить / расширить», копирование
     ===================================================================== */

  function initSummary() {
    var root = $('[data-widget="summary"]');
    var topic = window.VOV_TOPIC;
    if (!root || !topic || !topic.summary) return;

    var MODES = [
      { id: "short", label: "Кратко", hint: "4–5 тезисов" },
      { id: "medium", label: "Средне", hint: "7–9 тезисов" },
      { id: "full", label: "Подробно", hint: "12–15 тезисов" },
    ];
    var mode = "medium";
    var status = "idle"; // idle | loading | done
    var timer = null;

    var modeIndex = function () {
      return MODES.map(function (m) {
        return m.id;
      }).indexOf(mode);
    };

    function render() {
      var mi = modeIndex();
      var chips = MODES.map(function (m) {
        return (
          '<button type="button" role="radio" aria-checked="' + (mode === m.id) + '" class="chip chip-outline ' + (mode === m.id ? "is-active" : "") + '" data-mode="' + m.id + '" title="' + m.hint + '">' + m.label + "</button>"
        );
      }).join("");

      var body = "";
      if (status === "idle") {
        body = '<div class="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Здесь появится конспект темы «' + esc(topic.title) + "» — " + MODES[mi].hint + ".</div>";
      } else if (status === "loading") {
        body = '<div class="space-y-3" aria-label="Загрузка"><div class="skeleton h-4 w-11/12"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-10/12"></div><div class="skeleton h-4 w-9/12"></div></div>';
      } else {
        body =
          '<div><div class="mb-4 flex flex-wrap items-center gap-2"><span class="chip">Подготовленный конспект</span>' +
          '<span class="chip chip-outline" style="cursor:default">' + MODES[mi].label + "</span>" +
          '<span class="text-xs text-muted">Составлен по тексту темы.</span></div>' +
          '<ul class="summary-list space-y-2.5" data-summary-list></ul></div>';
      }

      root.innerHTML =
        '<div class="card p-6 md:p-8">' +
        '<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div>' +
        '<div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-full" style="background:var(--gold-tint);color:var(--gold)" aria-hidden="true">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8L12 3zM19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1-2.1-.9 2.1-.9L19 15zM5 14l.7 1.6 1.6.7-1.6.7L5 18.6l-.7-1.6-1.6-.7 1.6-.7L5 14z"/></svg></span>' +
        '<h3 class="text-lg font-bold ff-serif">Конспект темы</h3></div>' +
        '<p class="mt-1 text-sm text-muted">Выберите объём и нажмите «Сгенерировать». Кнопками «Сократить» и «Расширить» объём меняется на лету.</p></div>' +
        '<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Объём конспекта">' + chips + "</div></div>" +
        '<div class="mt-6 flex flex-wrap gap-2">' +
        '<button type="button" class="btn btn-primary" data-act="generate"' + (status === "loading" ? " disabled" : "") + ">" +
        (status === "loading"
          ? '<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>Генерируем…'
          : status === "done"
            ? "Сгенерировать заново"
            : "Сгенерировать конспект") +
        "</button>" +
        (status === "done"
          ? '<button type="button" class="btn btn-ghost" data-act="shorter"' + (mi === 0 ? " disabled" : "") + ">− Сократить</button>" +
            '<button type="button" class="btn btn-ghost" data-act="longer"' + (mi === MODES.length - 1 ? " disabled" : "") + ">+ Расширить</button>" +
            '<button type="button" class="btn btn-ghost" data-act="copy">Скопировать</button>'
          : "") +
        "</div>" +
        '<div class="mt-6 min-h-[120px]" aria-live="polite">' + body + "</div></div>";

      // тезисы появляются по одному — как будто их «печатает» генератор
      if (status === "done") {
        var listEl = $("[data-summary-list]", root);
        var bullets = topic.summary[mode] || [];
        var i = 0;
        var tick = function () {
          if (!listEl || i >= bullets.length) return;
          var li = document.createElement("li");
          li.textContent = bullets[i++];
          listEl.appendChild(li);
          timer = window.setTimeout(tick, 140);
        };
        timer = window.setTimeout(tick, 120);
      }
    }

    function generate(nextMode) {
      if (timer) window.clearTimeout(timer);
      mode = nextMode || mode;
      status = "loading";
      render();
      timer = window.setTimeout(function () {
        status = "done";
        render();
      }, 450);
    }

    root.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-mode]");
      if (chip) {
        if (status === "done") generate(chip.getAttribute("data-mode"));
        else if (status === "idle") {
          mode = chip.getAttribute("data-mode");
          render();
        }
        return;
      }
      var btn = e.target.closest("[data-act]");
      if (!btn || btn.disabled) return;
      var act = btn.getAttribute("data-act");
      var mi = modeIndex();
      if (act === "generate") generate();
      else if (act === "shorter" && mi > 0) generate(MODES[mi - 1].id);
      else if (act === "longer" && mi < MODES.length - 1) generate(MODES[mi + 1].id);
      else if (act === "copy") {
        var text = topic.title + "\n\n" + (topic.summary[mode] || []).map(function (b) { return "• " + b; }).join("\n");
        var done = function () {
          btn.textContent = "Скопировано ✓";
          window.setTimeout(function () {
            btn.textContent = "Скопировать";
          }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          // запасной способ для file:// и старых браузеров
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            done();
          } catch (err) {
            /* копирование недоступно */
          }
          ta.remove();
        }
      }
    });

    render();
  }

  /* =====================================================================
     Викторина: вопросы по одному, проверка, объяснения, баллы, разбор
     ===================================================================== */

  function initQuiz() {
    var root = $('[data-widget="quiz"]');
    var topic = window.VOV_TOPIC;
    if (!root || !topic || !topic.quiz || !topic.quiz.length) return;

    var Q = topic.quiz;
    var total = Q.length;
    var LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
    var index = 0;
    var selected = null;
    var answers = Q.map(function () {
      return null;
    });
    var finished = false;

    var score = function () {
      return answers.reduce(function (n, a, i) {
        return n + (a === Q[i].correct ? 1 : 0);
      }, 0);
    };

    function resultMessage(percent) {
      if (percent === 100) return ["Блестяще!", "Вы ответили правильно на все вопросы. Тема усвоена отлично."];
      if (percent >= 75) return ["Отличный результат", "Вы хорошо знаете тему. Просмотрите разбор ошибок, чтобы закрепить материал."];
      if (percent >= 50) return ["Неплохо", "Основное вы усвоили, но стоит перечитать конспект и пройти викторину ещё раз."];
      return ["Стоит повторить", "Вернитесь к обзору темы и хронологии — и попробуйте снова."];
    }

    function questionHtml() {
      var q = Q[index];
      var options = q.options
        .map(function (opt, i) {
          var cls = "quiz-option";
          if (selected !== null) {
            if (i === q.correct) cls += " is-correct";
            else if (i === selected) cls += " is-wrong";
          }
          return '<button type="button" class="' + cls + '" data-opt="' + i + '"' + (selected !== null ? " disabled" : "") + '><span class="opt-letter">' + LETTERS[i] + "</span><span>" + esc(opt) + "</span></button>";
        })
        .join("");
      var feedback = "";
      if (selected !== null) {
        var ok = selected === q.correct;
        feedback =
          '<div class="mt-5 rounded-2xl p-4" style="background:' + (ok ? "var(--green-tint)" : "var(--wine-tint)") + '" role="status">' +
          '<p class="font-bold">' + (ok ? "Верно!" : "Неверно.") + "</p>" +
          '<p class="mt-1 text-sm text-soft">' + esc(q.explanation) + "</p>" +
          '<button type="button" class="btn btn-primary mt-4" data-next>' + (index < total - 1 ? "Следующий вопрос →" : "Показать результат") + "</button></div>";
      }
      return (
        '<div class="card p-6 md:p-8">' +
        '<div class="flex flex-wrap items-center justify-between gap-3"><span class="text-sm font-bold text-muted">Вопрос ' + (index + 1) + " из " + total + '</span><span class="chip chip-green">Баллы: ' + score() + "</span></div>" +
        '<div class="progress-track mt-3" aria-hidden="true"><div class="progress-fill" style="width:' + ((index + (selected !== null ? 1 : 0)) / total) * 100 + '%"></div></div>' +
        '<h3 class="mt-6 text-xl font-bold ff-serif leading-snug">' + esc(q.question) + "</h3>" +
        '<div class="mt-5 grid gap-2.5" role="group" aria-label="Варианты ответа">' + options + "</div>" +
        feedback +
        "</div>"
      );
    }

    function resultHtml() {
      var s = score();
      var percent = Math.round((s / total) * 100);
      var msg = resultMessage(percent);
      var review = Q.map(function (q, i) {
        var ok = answers[i] === q.correct;
        return (
          '<li class="rounded-2xl border border-line p-4"><div class="flex items-start gap-3">' +
          '<span class="chip ' + (ok ? "chip-green" : "chip-wine") + ' shrink-0">' + (ok ? "Верно" : "Ошибка") + "</span><div>" +
          '<p class="font-semibold">' + (i + 1) + ". " + esc(q.question) + "</p>" +
          (!ok && answers[i] !== null ? '<p class="mt-1 text-sm text-wine">Ваш ответ: ' + esc(q.options[answers[i]]) + "</p>" : "") +
          '<p class="mt-1 text-sm text-green font-semibold">Правильно: ' + esc(q.options[q.correct]) + "</p>" +
          '<p class="mt-1 text-sm text-soft">' + esc(q.explanation) + "</p></div></div></li>"
        );
      }).join("");
      return (
        '<div class="card p-6 md:p-8">' +
        '<div class="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">' +
        '<div class="mx-auto grid h-32 w-32 place-items-center rounded-full ff-serif text-3xl font-bold" style="background:conic-gradient(var(--green-2) ' + percent + '%, var(--bg-soft) 0);color:var(--ink)" role="img" aria-label="Результат: ' + percent + ' процентов">' +
        '<span class="grid h-24 w-24 place-items-center rounded-full bg-elev">' + percent + "%</span></div>" +
        '<div><p class="eyebrow">Результат</p><h3 class="mt-2 text-2xl font-bold ff-serif">' + msg[0] + "</h3>" +
        '<p class="mt-1 text-soft">Правильных ответов: <strong class="text-ink">' + s + "</strong> из " + total + ". " + msg[1] + "</p>" +
        '<p class="mt-3 text-sm text-muted">Результат сохранён в браузере, тема отмечена как изученная.</p>' +
        '<div class="mt-4 flex flex-wrap gap-2"><button type="button" class="btn btn-primary" data-restart>Пройти ещё раз</button><a href="#summary" class="btn btn-ghost">Повторить конспект</a></div></div></div>' +
        '<div class="mt-8 border-t border-line pt-6"><h4 class="text-sm font-bold uppercase tracking-wider text-muted">Разбор ответов</h4><ol class="mt-4 space-y-4">' + review + "</ol></div></div>"
      );
    }

    function render() {
      root.innerHTML = finished ? resultHtml() : questionHtml();
    }

    root.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-opt]");
      if (opt && selected === null && !finished) {
        selected = Number(opt.getAttribute("data-opt"));
        answers[index] = selected;
        render();
        var nextBtn = $("[data-next]", root);
        if (nextBtn) nextBtn.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest("[data-next]")) {
        if (index < total - 1) {
          index += 1;
          selected = null;
        } else {
          finished = true;
          markTopic(topic.slug, { completed: true, score: score(), total: total });
        }
        render();
        return;
      }
      if (e.target.closest("[data-restart]")) {
        index = 0;
        selected = null;
        answers = Q.map(function () {
          return null;
        });
        finished = false;
        render();
      }
    });

    render();
  }

  /* =====================================================================
     Галерея: просмотр изображений во весь экран
     ===================================================================== */

  function initGallery() {
    var root = $('[data-widget="gallery"]');
    if (!root) return;

    var overlay = null;
    var index = 0;
    var images = [];

    // список картинок собирается в момент открытия — без скрытых «битых» карточек
    function collect() {
      return $$("figure", root)
        .filter(function (f) {
          return !f.hasAttribute("data-broken-item") && $("img", f);
        })
        .map(function (f) {
          var img = $("img", f);
          var btn = $("button", f);
          return { src: img.currentSrc || img.src, alt: img.alt, caption: (btn && btn.getAttribute("data-caption")) || img.alt, figure: f };
        });
    }

    function show() {
      var item = images[index];
      if (!overlay || !item) return;
      $(".lightbox__img", overlay).src = item.src;
      $(".lightbox__img", overlay).alt = item.alt;
      $(".lightbox__caption", overlay).textContent = item.caption;
    }

    function close() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }

    function step(dir) {
      index = (index + dir + images.length) % images.length;
      show();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }

    function open(figure) {
      images = collect();
      index = Math.max(
        0,
        images.findIndex(function (it) {
          return it.figure === figure;
        })
      );
      overlay = document.createElement("div");
      overlay.className = "lightbox";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Просмотр изображения");
      overlay.innerHTML =
        '<div class="lightbox__inner"><img class="lightbox__img" alt=""/><p class="lightbox__caption"></p>' +
        '<button type="button" class="btn btn-light btn-icon lightbox__close" aria-label="Закрыть">✕</button>' +
        (images.length > 1
          ? '<button type="button" class="btn btn-light btn-icon lightbox__prev" aria-label="Предыдущее">‹</button><button type="button" class="btn btn-light btn-icon lightbox__next" aria-label="Следующее">›</button>'
          : "") +
        "</div>";
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay || e.target.closest(".lightbox__close")) close();
        else if (e.target.closest(".lightbox__prev")) step(-1);
        else if (e.target.closest(".lightbox__next")) step(1);
      });
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      show();
      $(".lightbox__close", overlay).focus();
    }

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("figure button");
      if (btn) open(btn.closest("figure"));
    });
  }

  /* =====================================================================
     Запуск
     ===================================================================== */

  function start() {
    safely("тема оформления", initTheme);
    safely("изображения", initImages);
    safely("появление блоков", initReveal);
    safely("кнопка «Наверх»", initBackToTop);
    safely("хаб", initHub);
    safely("шапка темы", initTopicNav);
    safely("отметка «изучено»", initMarkStudied);
    safely("карта", initMap);
    safely("конспект", initSummary);
    safely("викторина", initQuiz);
    safely("галерея", initGallery);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
