let selectedPawn = null;
const inspector = document.getElementById("inspector");

/**
 * Инициализация инспектора: настройка слушателей событий для выбора пешек
 * @param {Array} pawns - Ссылка на массив пешек
 * @param {HTMLCanvasElement} canvas - Холст симуляции
 */
function initInspector(pawns, canvas) {
  console.log("Inspector initialized");
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Ищем пешку под курсором в АКТУАЛЬНОМ массиве
    const activePawns = (typeof window.getSimPawns === 'function') ? window.getSimPawns() : [];
    const clickedPawn = activePawns.find((p) => {
      const dist = Math.sqrt((p.x - mouseX) ** 2 + (p.y - mouseY) ** 2);
      return dist < Math.max(p.size, 10) + 20;
    });

    if (clickedPawn) {
      console.log("Pawn selected:", clickedPawn.name);
      selectedPawn = clickedPawn;
    } else {
      // Клик в пустоту теперь закрывает инспектор
      selectedPawn = null;
    }
  });


  // Закрытие по ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      selectedPawn = null;
      if (inspector) inspector.classList.remove("flipped");
    }
  });

  // Переворот по двойному клику
  if (inspector) {
    inspector.addEventListener("dblclick", (e) => {
      // Игнорируем клики по элементам управления (кнопка закрытия, ссылки)
      if (e.target.closest(".pawn-link") || e.target.id === "inspector-close" || e.target.id === "hud-color-box") return;
      inspector.classList.toggle("flipped");
    });
  }
}

/**
 * Глобальное обновление интерфейса инспектора (вызывается каждый кадр)
 */
function updateHUD() {
  // 1. Если пешка не выбрана или удалена, прячем инспектор
  if (!selectedPawn || selectedPawn.shouldRemove) {
    if (selectedPawn && selectedPawn.shouldRemove) selectedPawn = null;
    if (inspector) {
      inspector.style.display = "none";
      inspector.classList.remove("flipped");
    }
    return;
  }

  // 2. Если выбрана - показываем
  if (inspector) inspector.style.display = "block";

  // --- ЛОГИКА ПОЗИЦИОНИРОВАНИЯ ---
  // Используем реальные размеры элемента для определения "зоны опасности"
  // Это позволит инспектору адаптироваться, если мы добавим в него новый контент.
  const margin = 40;
  const dangerZoneX = inspector.offsetWidth + margin;
  const dangerZoneY = inspector.offsetHeight + margin; 

  let currentSide = "left";
  if (selectedPawn.x < dangerZoneX && selectedPawn.y < dangerZoneY) {
    currentSide = "right";
  }

  if (currentSide === "left") {
    inspector.style.left = "20px";
    inspector.style.right = "auto";
    inspector.classList.remove("inspector-right");
    inspector.classList.add("inspector-left");
  } else {
    inspector.style.left = "auto";
    inspector.style.right = "20px";
    inspector.classList.remove("inspector-left");
    inspector.classList.add("inspector-right");
  }
  inspector.style.top = "20px";

  // --- РАСЧЕТ ДАННЫХ ---
  const mapSide = (typeof CONFIG !== 'undefined' && CONFIG.MAP_SIDE) ? CONFIG.MAP_SIDE : 9;
  const zoneSide = mapSide / 3;

  let c = Math.floor((selectedPawn.x / window.innerWidth) * mapSide);
  let r = Math.floor((selectedPawn.y / window.innerHeight) * mapSide);

  c = Math.max(0, Math.min(mapSide - 1, c));
  r = Math.max(0, Math.min(mapSide - 1, r));

  const macroC = Math.floor(c / zoneSide);
  const macroR = Math.floor(r / zoneSide);
  const macroId = (macroR * 3) + macroC + 1;

  const localC = c % zoneSide;
  const localR = r % zoneSide;
  const microId = (localR * 3) + localC + 1;

  const displayId = selectedPawn.getCellId(window.innerWidth, window.innerHeight);

  // --- ОБНОВЛЕНИЕ DOM ---
  const contentDiv = document.getElementById("inspector-content");
  if (!contentDiv) return;

  // Если структура еще не создана
  if (!contentDiv.querySelector("#inspector-pawn-header")) {
    contentDiv.innerHTML = `
        <div id="inspector-pawn-header">
            <div id="hud-color-box" title="Кликни для эффекта и копирования цвета"></div>
            <div id="inspector-pawn-info">
                <span id="hud-name" title="Кликните, чтобы скопировать имя"></span>
                <span id="hud-cell-label">КЛЕТКА: <span id="hud-cell"></span></span>
            </div>
            <div id="inspector-close" title="Закрыть (Esc)">×</div>
        </div>

        <div class="inspector-details">
            <p>⏳ Возраст: <span id="hud-age" class="stat-value"></span></p>
            <p>🏷️ Статус: <span id="hud-status" class="stat-value"></span></p>
            <p>🧠 Темперамент: <span id="hud-temp" class="stat-value"></span></p>
            <p>👨‍👩‍👦 Родители: <span id="hud-parents" class="stat-value"></span></p>
            <p>👶 Дети: <span id="hud-children" class="stat-value"></span></p>
            <p>❤️ Пара: <span id="hud-partner" class="stat-value"></span></p>
        </div>
      `;

    // ДЕЛЕГИРОВАНИЕ КЛИКОВ (для всех ссылок)
    contentDiv.addEventListener("click", (e) => {
      const link = e.target.closest(".pawn-link");
      if (link) {
        const name = link.getAttribute("data-pawn-name");
        if (name) switchToPawn(name);
      }
    });

    // Обработчик на цветной кружок
    const colorBox = document.getElementById("hud-color-box");
    if (colorBox) {
      colorBox.addEventListener("click", () => {
        if (!selectedPawn) return;
        if (typeof window.spawnRipple === "function") {
          window.spawnRipple(selectedPawn.x, selectedPawn.y, selectedPawn);
        }
        try {
          const rgb = selectedPawn.baseColor.match(/\d+/g);
          if (rgb && rgb.length === 3) {
            const r = parseInt(rgb[0]).toString(16).padStart(2, '0');
            const g = parseInt(rgb[1]).toString(16).padStart(2, '0');
            const b = parseInt(rgb[2]).toString(16).padStart(2, '0');
            const hex = `#${r}${g}${b}`.toUpperCase();
            navigator.clipboard.writeText(hex).catch(err => console.error("Clipboard error:", err));
          }
        } catch (e) { console.error(e); }
      });
    }

    // Обработчик на имя
    const nameElClick = document.getElementById("hud-name");
    if (nameElClick) {
      nameElClick.addEventListener("click", () => {
        if (selectedPawn) navigator.clipboard.writeText(selectedPawn.name).then(() => {
          console.log("Name copied to clipboard:", selectedPawn.name);
        }).catch(err => {
          console.error("Failed to copy name:", err);
        });
      });
    }

    // Обработчик закрытия
    const closeBtn = document.getElementById("inspector-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedPawn = null;
      });
    }
  }

  // --- ЗАПОЛНЕНИЕ ДАННЫМИ ---
  if (contentDiv) {
    const activePawns = (typeof window.getSimPawns === 'function') ? window.getSimPawns() : [];

    // Сброс переворота при выборе новой пешки (если ключ изменился)
    const pawnKey = selectedPawn.name;
    if (inspector.dataset.lastPawnName !== pawnKey) {
      inspector.classList.remove("flipped");
      inspector.dataset.lastPawnName = pawnKey;
    }

    // Хелпер для ссылок (всегда ищем в свежем массиве)
    const getPawnLink = (name) => {
      if (!name || name === "—") return "—";
      const exists = activePawns.some(p => p.name === name && !p.shouldRemove && p.color !== "#000000");
      if (exists) {
        return `<span class="pawn-link" data-pawn-name="${name}">${name}</span>`;
      }
      return `<span class="stat-value-dead" title="Этой пешки нет в живых">${name}</span>`;
    };

    const cellEl = document.getElementById("hud-cell");
    if (cellEl) cellEl.textContent = displayId;

    const colorEl = document.getElementById("hud-color-box");
    if (colorEl) colorEl.style.backgroundColor = selectedPawn.baseColor;

    const nameEl = document.getElementById("hud-name");
    if (nameEl && nameEl.textContent !== selectedPawn.name) nameEl.textContent = selectedPawn.name;

    const ageEl = document.getElementById("hud-age");
    if (ageEl) ageEl.textContent = `${Math.floor(selectedPawn.ageDays)} дн.`;

    const statusEl = document.getElementById("hud-status");
    if (statusEl) {
      let statusText = "Взрослый";
      if (selectedPawn.ageDays < 6) statusText = "Молодой";
      else if (selectedPawn.ageDays >= 21) statusText = "Мертв 💀";
      else if (selectedPawn.ageDays >= 15) statusText = "Старейшина";
      statusEl.textContent = statusText;
    }

    const tempEl = document.getElementById("hud-temp");
    if (tempEl) {
      const tempMap = {
        "choleric": "Холерик",
        "sanguine": "Сангвиник",
        "phlegmatic": "Флегматик",
        "melancholic": "Меланхолик"
      };
      tempEl.textContent = tempMap[selectedPawn.temperament] || selectedPawn.temperament;
    }

    // Обновляем списки только при изменении
    const currentPawnKey = `${selectedPawn.name}_${selectedPawn.children.length}_${selectedPawn.partner ? selectedPawn.partner.name : 'none'}`;
    if (contentDiv.dataset.lastPawnKey !== currentPawnKey) {
      contentDiv.dataset.lastPawnKey = currentPawnKey;

      const parentsEl = document.getElementById("hud-parents");
      if (parentsEl) parentsEl.innerHTML = `${getPawnLink(selectedPawn.parent1Name)}, ${getPawnLink(selectedPawn.parent2Name)}`;

      const childrenEl = document.getElementById("hud-children");
      if (childrenEl) {
        childrenEl.innerHTML = selectedPawn.children.length === 0 ? "Нет" : selectedPawn.children.map(c => getPawnLink(c.name)).join(", ");
      }

      const partnerEl = document.getElementById("hud-partner");
      if (partnerEl) {
        partnerEl.innerHTML = selectedPawn.partner ? getPawnLink(selectedPawn.partner.name) : "Нет";
      }
    }

    // --- ДИНАМИЧЕСКАЯ ВЫСОТА ---
    const activeFace = inspector.classList.contains("flipped")
      ? document.getElementById("inspector-back")
      : document.getElementById("inspector-front");

    if (activeFace) {
      // Устанавливаем высоту инспектора по высоте контента активной стороны
      const contentHeight = activeFace.scrollHeight;
      if (contentHeight > 50) { // Защита от нулевой высоты
        inspector.style.height = contentHeight + "px";
      }
    }

    // --- ОБНОВЛЕНИЕ ОБРАТНОЙ СТОРОНЫ ---
    const backDiv = document.getElementById("inspector-back");
    if (backDiv) {
      const tempMap = {
        "choleric": "Холерик",
        "sanguine": "Сангвиник",
        "phlegmatic": "Флегматик",
        "melancholic": "Меланхолик"
      };
      const tempName = tempMap[selectedPawn.temperament] || selectedPawn.temperament;

      // Конвертация цвета в HEX
      let hexColor = "#888888";
      try {
        const rgb = selectedPawn.baseColor.match(/\d+/g);
        if (rgb) {
          hexColor = "#" + rgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
        }
      } catch (e) { }

      // Текущее дело
      const isNight = (typeof getDayLight === 'function' && getDayLight() < 0.2);
      const activity = isNight ? "Отдыхает" : "Гуляет";

      backDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="font-size: 0.7em; color: var(--accent-color); text-transform: uppercase;">${activity}</div>
                <h3 style="margin: 0; color: #fff; font-size: 1.25em; letter-spacing: 0.5px;">${selectedPawn.personalName}</h3>
                <div style="font-size: 0.85em; color: var(--text-dim); margin-bottom: 12px; font-style: italic;">Род: ${selectedPawn.clanName || "Первый из рода"}</div>
                
                <div class="inspector-details">
                    <p>🧬 Поколение: <span class="stat-value">${selectedPawn.generation}</span></p>
                    <p>👑 Вес рода: <span class="stat-value">${selectedPawn.clanWeight}</span></p>
                    <p>📏 Размер: <span class="stat-value">${selectedPawn.size.toFixed(1)}</span></p>
                    <p>🎨 Цвет: <span class="stat-value" style="font-family: monospace; font-size: 0.9em;">${hexColor}</span></p>
                    <p>🧠 Психика: <span class="stat-value">${tempName}</span></p>
                    <p style="margin-top:24px; font-size: 0.7em; color: var(--text-dim); text-align:center; opacity: 0.5;">
                        <i>Двойной клик на пустое место — назад</i>
                    </p>
                </div>
            </div>
        `;
    }
  }
}

/**
 * Переключение инспектора на конкретную пешку по её имени
 * @param {string} name - Имя пешки
 */
function switchToPawn(name) {
  if (typeof window.getSimPawns !== 'function') return;
  const activePawns = window.getSimPawns();
  const cleanName = name.trim();
  const found = activePawns.find(p => p.name === cleanName && !p.shouldRemove && p.color !== "#000000");
  if (found) {
    selectedPawn = found;
    const contentDiv = document.getElementById("inspector-content");
    if (contentDiv) contentDiv.dataset.lastPawnKey = "";
    if (typeof window.spawnRipple === "function") window.spawnRipple(found.x, found.y, found);
    updateHUD();
  }
}

/**
 * Инициализация нижней панели управления
 * @param {Function} onSpawnPawn - Callback для создания пешки (устарело)
 * @param {Function} onTogglePause - Callback для смены скорости/паузы
 */
function initBottomPanel(onSpawnPawn, onTogglePause) {
  // 1. Создание контейнера
  const container = document.createElement('div');
  container.id = 'bottom-panel-container';

  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'bottom-panel-toggle';
  toggleBtn.innerHTML = '&#9650;';
  toggleBtn.title = "Панель управления";

  const content = document.createElement('div');
  content.id = 'bottom-panel-content';
  content.innerHTML = `
    <!-- Блок управления временем -->
    <div class="hud-group">
      <div class="hud-controls-speed">
        <button id="btn-speed-0" class="hud-btn-icon" title="Пауза (Space)">⏸</button>
        <button id="btn-speed-1" class="hud-btn-icon active" title="Скорость x1">1x</button>
        <button id="btn-speed-5" class="hud-btn-icon" title="Скорость x5 (dblclick: x50)">5x</button>
        <button id="btn-speed-10" class="hud-btn-icon" title="Скорость x10 (dblclick: x100)">10x</button>
      </div>
    </div>

    <!-- Блок дня и цикла -->
    <div class="hud-group day-info-group">
      <div class="day-number-wrapper">
        <div class="stat-label">ДЕНЬ</div>
        <div id="stat-day" class="hud-stat-value">1</div>
        <div id="day-tally" class="tally-container"></div>
      </div>
      
      <div class="day-cycle-widget">
        <!-- Два раздельных диска для разной скорости вращения дня и ночи -->
        <div id="day-cycle-sun-disc" class="cycle-disc">
            <div class="cycle-icon-wrapper cycle-sun-wrapper">☀️</div>
        </div>
        <div id="day-cycle-moon-disc" class="cycle-disc">
            <div class="cycle-icon-wrapper cycle-moon-wrapper">🌙</div>
        </div>
        <div class="cycle-sky-overlay"></div>
      </div>
    </div>

    <!-- Блок переключателей -->
    <div class="hud-group">
      <div class="hud-toggles-vertical">
        <button id="btn-toggle-grid" class="hud-btn-mini" title="Сетка (G)">#</button>
        <button id="btn-toggle-night" class="hud-btn-mini active" title="Смена дня/ночи (N)">🌓</button>
      </div>
    </div>
  `;

  container.appendChild(content);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);

  // 2. Логика сворачивания панели
  let isExpanded = false;

  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      content.classList.add('expanded');
      toggleBtn.innerHTML = '&#9660;';
    } else {
      content.classList.remove('expanded');
      toggleBtn.innerHTML = '&#9650;';
    }
  });

  // 3. Логика управления скоростью
  const speedButtons = {
    0: document.getElementById('btn-speed-0'),
    1: document.getElementById('btn-speed-1'),
    5: document.getElementById('btn-speed-5'),
    10: document.getElementById('btn-speed-10')
  };

  Object.entries(speedButtons).forEach(([speed, btn]) => {
    btn.addEventListener('click', () => {
      Object.values(speedButtons).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onTogglePause) onTogglePause(speed == 0, parseFloat(speed));
    });
  });

  // Скрытые скорости: x50 и x100 через даблклик
  speedButtons[5].addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (onTogglePause) onTogglePause(false, 50);
  });

  speedButtons[10].addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (onTogglePause) onTogglePause(false, 100);
  });

  // Переключатели
  const gridBtn = document.getElementById('btn-toggle-grid');
  gridBtn.addEventListener('click', () => {
    const isActive = gridBtn.classList.toggle('active');
    if (window.onToggleGrid) window.onToggleGrid(isActive);
  });

  const nightBtn = document.getElementById('btn-toggle-night');
  nightBtn.addEventListener('click', () => {
    const isActive = nightBtn.classList.toggle('active');
    if (window.onToggleNightVisual) window.onToggleNightVisual(isActive);
  });
}

/**
 * Обновление данных на нижней панели
 * @param {number} population - Текущая численность (не исп.)
 * @param {number} day - Текущий день
 * @param {number} gameTime - Общее время симуляции
 * @param {number} dayDuration - Длительность суток
 */
function updateBottomPanel(population, day, gameTime, dayDuration) {
  const dayEl = document.getElementById('stat-day');
  if (dayEl) dayEl.textContent = day;

  // Логика палочек (tally marks)
  const tallyContainer = document.getElementById('day-tally');
  if (tallyContainer) {
    const count = ((day - 1) % 5) + 1;
    let tallyHtml = '';
    for (let i = 0; i < Math.min(count, 4); i++) {
      tallyHtml += '<span class="tally-stick"></span>';
    }
    if (count === 5) {
      tallyHtml += '<span class="tally-cross"></span>';
    }
    if (tallyContainer.dataset.lastCount !== count.toString()) {
      tallyContainer.innerHTML = tallyHtml;
      tallyContainer.dataset.lastCount = count.toString();
    }
  }

  // --- ВРАЩЕНИЕ СОЛНЦА И ЛУНЫ (60/40 split) ---
  const sunDisc = document.getElementById('day-cycle-sun-disc');
  const moonDisc = document.getElementById('day-cycle-moon-disc');
  const widget = document.querySelector('.day-cycle-widget');
  const sunIcon = document.querySelector('.cycle-sun-wrapper');
  const moonIcon = document.querySelector('.cycle-moon-wrapper');

  if (sunDisc && moonDisc) {
    const progress = (gameTime % dayDuration) / dayDuration;

    // Тайминги по запросу: солнце с 0.1 до 0.7 (60%), луна остальное время (40%)
    const SUN_START = 0.1;
    const SUN_END = 0.7;

    // --- 1. ПЛАВНЫЙ ЦВЕТ НЕБА ---
    const colorPoints = [
      { p: 0.0, c: [10, 10, 25, 0.95] },   // Глубокая ночь (Луна в зените)
      { p: 0.1, c: [10, 10, 25, 0.95] },   // Момент появления солнца (все еще темно)
      { p: 0.2, c: [230, 140, 60, 0.85] },  // Рассвет (солнце поднялось на 1/6 пути)
      { p: 0.4, c: [100, 190, 255, 0.85] }, // ЗЕНИТ (солнце в самом верху, ярко голубой)
      { p: 0.55, c: [230, 80, 40, 0.85] },  // Начало заката
      { p: 0.7, c: [10, 10, 25, 0.95] },    // Ночь (солнце ушло за горизонт)
      { p: 1.0, c: [10, 10, 25, 0.95] }     // Конец цикла
    ];

    let skyColor = 'rgba(10, 10, 25, 0.95)';
    for (let i = 0; i < colorPoints.length - 1; i++) {
      const pt1 = colorPoints[i];
      const pt2 = colorPoints[i + 1];
      if (progress >= pt1.p && progress <= pt2.p) {
        const segP = (progress - pt1.p) / (pt2.p - pt1.p);
        const r = Math.round(pt1.c[0] + (pt2.c[0] - pt1.c[0]) * segP);
        const g = Math.round(pt1.c[1] + (pt2.c[1] - pt1.c[1]) * segP);
        const b = Math.round(pt1.c[2] + (pt2.c[2] - pt1.c[2]) * segP);
        const a = pt1.c[3] + (pt2.c[3] - pt1.c[3]) * segP;
        skyColor = `rgba(${r}, ${g}, ${b}, ${a})`;
        break;
      }
    }
    if (widget) widget.style.setProperty('--sky-color', skyColor);

    // --- 2. ЛОГИКА ОРБИТ ---
    if (progress >= SUN_START && progress < SUN_END) {
      // ДЕНЬ (Солнце)
      sunDisc.style.display = 'block';
      moonDisc.style.display = 'none';

      const sunProgress = (progress - SUN_START) / (SUN_END - SUN_START);
      const angle = (sunProgress * 180) - 90;
      sunDisc.style.transform = `rotate(${angle}deg)`;
      if (sunIcon) sunIcon.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
    } else {
      // НОЧЬ (Луна)
      sunDisc.style.display = 'none';
      moonDisc.style.display = 'block';

      // Прогресс луны идет от 0.7 через 1.0/0.0 до 0.1
      let nightProgress;
      if (progress >= SUN_END) {
        nightProgress = (progress - SUN_END) / (1.1 - SUN_END); // 0.7 -> 1.0
      } else {
        nightProgress = (progress + (1.0 - SUN_END)) / (1.1 - SUN_END); // 0.0 -> 0.1
      }

      const angle = (nightProgress * 180) - 90;
      moonDisc.style.transform = `rotate(${angle}deg)`;
      if (moonIcon) moonIcon.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
    }
  }
}

/**
 * Инициализация верхней панели статистики
 * @param {Function} onSpawnPawn - Обработчик нажатия на кнопку добавления пешки
 */
function initTopPanel(onSpawnPawn) {
  const container = document.getElementById('top-panel-container');
  const content = document.getElementById('top-panel-content');
  const toggleBtn = document.getElementById('top-panel-toggle');

  if (!container || !content || !toggleBtn) {
    console.error("Top panel elements not found in HTML!");
    return;
  }

  content.innerHTML = `
    <div class="top-stat-section">
      <div class="top-stat-row">
        <span>Всего сейчас:</span>
        <b id="stat-current-pawns">0</b>
      </div>
      <div class="top-stat-row">
        <span>За всю историю:</span>
        <b id="stat-total-pawns">0</b>
      </div>
    </div>

    <div class="top-stat-section legacy-records">
      <div class="top-stat-row mini">
        <span>Макс. поколение:</span>
        <b id="stat-max-gen">1</b>
      </div>
      <div class="top-stat-row mini">
        <span>Пик веса рода:</span>
        <b id="stat-max-weight">0</b>
      </div>
    </div>

    <div class="demographic-tree">
      <div class="stage-row">
        <div class="stage-info"><span>👶 Молодые</span><span id="label-young">0 (0%)</span></div>
        <div class="stat-progress-bg"><div id="bar-young" class="stat-progress-fill fill-young"></div></div>
      </div>
      <div class="stage-row">
        <div class="stage-info"><span>🧑 Взрослые</span><span id="label-adult">0 (0%)</span></div>
        <div class="stat-progress-bg"><div id="bar-adult" class="stat-progress-fill fill-adult"></div></div>
      </div>
      <div class="stage-row">
        <div class="stage-info"><span>👴 Старики</span><span id="label-elder">0 (0%)</span></div>
        <div class="stat-progress-bg"><div id="bar-elder" class="stat-progress-fill fill-elder"></div></div>
      </div>
      <div class="stage-row">
        <div class="stage-info"><span>💀 Мертвые</span><span id="label-dead">0 (0%)</span></div>
        <div class="stat-progress-bg"><div id="bar-dead" class="stat-progress-fill fill-dead"></div></div>
      </div>
    </div>

    <div class="btn-spawn-wrapper">
      <button id="btn-add-pawn" class="hud-btn-wide">+ Добавить пешку</button>
    </div>
  `;

  let isExpanded = false;
  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    container.classList.toggle('expanded', isExpanded);
    toggleBtn.innerHTML = isExpanded ? '&#9650;' : '&#9660;';
    console.log("Top panel expanded:", isExpanded);
  });

  const addBtn = document.getElementById('btn-add-pawn');
  if (addBtn && onSpawnPawn) {
    addBtn.addEventListener('click', () => onSpawnPawn());
  }
}

/**
 * Обновление счетчиков и графиков на верхней панели
 * @param {Array} pawns - Массив живых пешек
 * @param {number} totalEver - Всего создано за историю
 * @param {number} maxGen - Рекорд поколений
 * @param {number} maxWeight - Рекорд веса рода
 */
function updateTopPanel(pawns, totalEver, maxGen, maxWeight) {
  const currentCount = pawns.length;
  const currentEl = document.getElementById('stat-current-pawns');
  if (currentEl) currentEl.textContent = currentCount;

  const totalEl = document.getElementById('stat-total-pawns');
  if (totalEl) totalEl.textContent = totalEver;

  const genEl = document.getElementById('stat-max-gen');
  if (genEl) genEl.textContent = maxGen;

  const weightEl = document.getElementById('stat-max-weight');
  if (weightEl) weightEl.textContent = maxWeight;

  if (currentCount === 0) return;

  // Считаем стадии
  let young = 0, adult = 0, elder = 0, dead = 0;
  pawns.forEach(p => {
    const age = p.ageDays;
    if (age < 6) young++;
    else if (age < 15) adult++;
    else if (age < 21) elder++;
    else dead++;
  });

  const updateStage = (id, count) => {
    const percent = Math.round((count / currentCount) * 100);
    const label = document.getElementById(`label-${id}`);
    const bar = document.getElementById(`bar-${id}`);
    if (label) label.textContent = `${count} (${percent}%)`;
    if (bar) bar.style.width = `${percent}%`;
  };

  updateStage('young', young);
  updateStage('adult', adult);
  updateStage('elder', elder);
  updateStage('dead', dead);
}
