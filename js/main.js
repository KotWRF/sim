const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let pawns = [];
window.getSimPawns = () => pawns; // Глобальный доступ к актуальному массиву
const INITIAL_COUNT = 50;
let totalPawnsCreated = INITIAL_COUNT; // Всего за всю историю
let maxGeneration = 1;
let maxClanWeight = 0;

// === ЛОГИКА СЕТКИ/МЫШИ (восстановлено) ===
let mouseX = 0;
let mouseY = 0;
let isMouseOver = false;

// === ЛОГИКА ЭФФЕКТОВ ===
const visualEffects = [];
let paused = false;
let timeScale = 1;
let showGrid = false;
let showNightVisual = true;

window.onToggleGrid = (val) => { showGrid = val; };
window.onToggleNightVisual = (val) => { showNightVisual = val; };

// Функция создания эффекта "круги на воде"
// Доступна глобально, чтобы вызывать из hud.js
// Используется при клике на цветной индикатор пешки в инспекторе
window.spawnRipple = function (x, y, targetPawn = null) {
  visualEffects.push({
    x: x, // Начальные координаты (на случай если цель исчезнет)
    y: y,
    target: targetPawn, // Ссылка на пешку для следования за ней
    startTime: performance.now(),
    duration: 1000, // 1 секунда
    maxRadius: 25, // Радиус круга
  });
};

function drawEffects(ctx) {
  // Отрисовка всех активных визуальных эффектов
  const now = performance.now();

  for (let i = visualEffects.length - 1; i >= 0; i--) {
    const fx = visualEffects[i];
    const elapsed = now - fx.startTime;

    if (elapsed > fx.duration) {
      visualEffects.splice(i, 1); // Удаляем завершенные
      continue;
    }

    const progress = elapsed / fx.duration; // 0.0 -> 1.0
    // Easing Out (быстро в начале, замедляется в конце)
    const t = 1 - Math.pow(1 - progress, 3);

    const currentRadius = fx.maxRadius * t;
    const currentAlpha = 1 - progress; // Исчезает к концу

    ctx.save();

    // Если есть цель (пешка) - берем её актуальные координаты
    let drawX = fx.x;
    let drawY = fx.y;

    if (fx.target) {
      drawX = fx.target.x;
      drawY = fx.target.y;
    }

    // Цвет "Кофе с молоком" (светлый бежевый)
    // RGB: 230, 215, 190
    ctx.beginPath();
    ctx.arc(drawX, drawY, currentRadius, 0, Math.PI * 2);

    // Тень для объема
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.3)";

    // Сам круг (заливка)
    ctx.fillStyle = `rgba(230, 215, 190, ${currentAlpha * 0.6})`;
    ctx.fill();

    // Обводка (чуть ярче)
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 240, 220, ${currentAlpha})`;
    ctx.stroke();

    ctx.restore();
  }
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  isMouseOver = true;
});

canvas.addEventListener("mouseleave", () => {
  isMouseOver = false;
});

function drawMouseGridOverlay(ctx, w, h) {
  if (!isMouseOver) return;

  // Конфигурация: 9x9 клеток
  const mapSide = (typeof CONFIG !== 'undefined' && CONFIG.MAP_SIDE) ? CONFIG.MAP_SIDE : 9;
  const zoneSide = mapSide / 3; // 3 клетки в большой зоне

  const cellW = w / mapSide;
  const cellH = h / mapSide;

  // 1. Координаты клетки (0-8)
  const c = Math.floor(mouseX / cellW);
  const r = Math.floor(mouseY / cellH);

  // Защита от выхода за границы
  if (c < 0 || c >= mapSide || r < 0 || r >= mapSide) return;

  // 2. Макро-регион (0-2)
  const macroC = Math.floor(c / zoneSide);
  const macroR = Math.floor(r / zoneSide);

  // ID Макро-региона (1..9): ряд * 3 + кол + 1
  const macroId = (macroR * 3) + macroC + 1;

  // 3. Микро-регион (внутри зоны тоже 0-2)
  const localC = c % zoneSide;
  const localR = r % zoneSide;

  // ID Микро-региона (1..9) по той же логике
  const microId = (localR * 3) + localC + 1;

  // Итоговый ID: "51", "55", "99"
  const displayId = `${macroId}${microId}`;

  // Координаты для рисования текста (правый верхний угол КЛЕТКИ)
  const cellRightX = (c + 1) * cellW;
  const cellTopY = (r) * cellH;

  ctx.save();

  // Подсветка текущей мелкой клетки (тусклее, было 0.6)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1; // Тоньше
  ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);

  // Подсветка макро-зоны (еле заметная, было 0.1)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2; // Тоньше
  ctx.strokeRect(
    macroC * zoneSide * cellW,
    macroR * zoneSide * cellH,
    zoneSide * cellW,
    zoneSide * cellH
  );

  // Текст (тусклее и меньше)
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  // Шрифт значительно меньше (было cellH/2)
  ctx.font = `bold ${Math.min(cellH / 4, 14)}px Arial`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  // Рисуем в углу текущей клетки (с минимальным отступом)
  ctx.fillText(displayId, cellRightX - 2, cellTopY + 2);

  ctx.restore();
}

/**
 * Масштабирование холста под размер окна браузера
 */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Пересоздаем карту и фон под новый размер окна
  if (typeof initMap === "function") {
    initMap(canvas.width, canvas.height);
  }
}

// Слушатель событий
window.addEventListener("resize", resize);

// 1. Сначала задаем размеры и генерим карту
resize();

// 2. Только после этого создаем пешек (теперь они знают размеры поля)
for (let i = 0; i < INITIAL_COUNT; i++) {
  // Рандомный возраст от 0 до 18 дней (чтобы не умирали сразу на старте)
  const randomAge = Math.random() * 18;
  pawns.push(new Pawn(canvas.width, canvas.height, randomAge, null, null, 1));
}

/**
 * Основной игровой цикл отрисовки
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Если у тебя есть эти функции (updateTime и т.д.), оставляем
  if (typeof updateTime === "function" && !paused) {
    for (let i = 0; i < timeScale; i++) updateTime();
  }

  if (typeof drawBackground === "function") drawBackground(ctx);
  if (showGrid && typeof drawGridLines === "function") drawGridLines(ctx, canvas.width, canvas.height);

  // 2. Рендеринг и логика пешек
  const currentDay = Math.floor(gameTime / CONFIG.DAY_DURATION) + 1;
  const light = getDayLight();

  // ОПТИМИЗАЦИЯ: Группируем пешек по клеткам один раз за кадр для социалки
  const cellGroups = new Map();
  if (!paused) {
    pawns.forEach(p => {
      const cid = p.getCellId(canvas.width, canvas.height);
      if (!cellGroups.has(cid)) cellGroups.set(cid, []);
      cellGroups.get(cid).push(p);
    });
  }
  window._simCellGroups = cellGroups; // Даем доступ для логики

  // Очистка мертвых
  pawns = pawns.filter(p => !p.shouldRemove);

  pawns.forEach((p) => {
    // Передаем worldMap (она уже создана в initMap внутри resize)
    if (!paused) {
      for (let i = 0; i < timeScale; i++) {
        p.update(canvas.width, canvas.height, currentDay, light);
      }
    }
    p.draw(ctx);
  });

  drawEffects(ctx); // Рисуем эффекты

  if (typeof drawOverlay === "function" && showNightVisual)
    drawOverlay(ctx, canvas.width, canvas.height);
  if (typeof updateHUD === "function") updateHUD();
  if (typeof updateTopPanel === "function") updateTopPanel(pawns, totalPawnsCreated, maxGeneration, maxClanWeight);
  if (typeof updateBottomPanel === "function") {
    const currentDay = typeof gameTime !== "undefined" && typeof CONFIG !== "undefined"
      ? Math.floor(gameTime / CONFIG.DAY_DURATION) + 1
      : 1;
    const dayDuration = (typeof CONFIG !== 'undefined') ? CONFIG.DAY_DURATION : 60;
    updateBottomPanel(pawns.length, currentDay, gameTime, dayDuration);
  }
  if (showGrid && typeof drawMouseGridOverlay === "function") {
    drawMouseGridOverlay(ctx, canvas.width, canvas.height);
  }

  requestAnimationFrame(draw);
}

// Запуск
draw();

// Если инспектор готов — запускаем
if (typeof initInspector === "function") {
  initInspector(pawns, canvas);
}

// Запускаем верхнюю панель
if (typeof initTopPanel === "function") {
  initTopPanel(() => {
    const newPawn = new Pawn(canvas.width, canvas.height, 0, null, null, 1); // Новая пешка (0 дней, 1 поколение)
    pawns.push(newPawn);
    totalPawnsCreated++;
  });
}

// Запускаем нижнюю панель
if (typeof initBottomPanel === "function") {
  initBottomPanel(
    null, // Кнопка спавна удалена по запросу
    (isPaused, scale) => {
      paused = isPaused;
      if (!isPaused) timeScale = scale;
    }
  );
}

// === ПАРТНЕРСТВО И РЕПРОДУКЦИЯ (Daily) ===
/**
 * Логика социального взаимодействия: поиск партнеров и репродукция
 * @param {Pawn} pawn - Объект пешки
 * @param {number} width - Ширина поля
 * @param {number} height - Высота поля
 */
window.handleDailyPawnLogic = function (pawn, width, height) {
  // 0. Проверка на вдовство
  if (pawn.partner && (pawn.partner.shouldRemove || pawn.partner.color === "#000000")) {
    pawn.partner = null;
  }

  // 1. Если есть пара - пробуем делать детей
  if (pawn.partner) {
    if (pawn.ageDays >= 6 && pawn.partner.ageDays >= 6 && !pawn.partner.shouldRemove) {
      // Базовый шанс 20%, Флегматики +5%
      let childChance = 0.2;
      if (pawn.temperament === "phlegmatic") childChance += 0.05;

      // ЛИМИТ ПОПУЛЯЦИИ: 2000 пешек
      if (pawns.length < 2000 && Math.random() < childChance) {
        spawnChild(pawn, pawn.partner, width, height);
      }
    }
  }
  // 2. Если нет пары - ищем партнера
  else {
    const currentCellId = pawn.getCellId(width, height);
    const cellMates = window._simCellGroups.get(currentCellId) || [];

    const potentialPartners = cellMates.filter(n =>
      n !== pawn && !n.partner && !n.shouldRemove && (n.color !== "#000000")
    );

    // Базовый шанс 50%, Холерик +10%, Флегматик -10%
    let pairChance = 0.5;
    if (pawn.temperament === "choleric") pairChance += 0.1;
    if (pawn.temperament === "phlegmatic") pairChance -= 0.1;

    if (potentialPartners.length > 0 && Math.random() < pairChance) {
      const newPartner = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
      pawn.partner = newPartner;
      newPartner.partner = pawn;
    }
  }
};

// === ГЕНЕТИКА ИМЕН И РОДОВ ===
/**
 * Генетическая рулетка для выбора рода (фамилии) ребенка
 * @param {Pawn} p1 - Первый родитель
 * @param {Pawn} p2 - Второй родитель
 * @returns {Object} { name: string, weight: number }
 */
function breedClans(p1, p2) {
  const vowels = "aeiou";
  const consonants = "bcdfghjklmnpqrstvwxyz";
  const getRandomChar = (str) => str[Math.floor(Math.random() * str.length)];

  // Сценарий 1: Основатели (1-е поколение, нет рода)
  if (!p1.clanName && !p2.clanName) {
    // Согл1 от родителя1 и Глас4 от родителя 2
    const c1 = p1.personalName[0];
    const v4 = p2.personalName[3];
    return { name: c1.toUpperCase() + v4, weight: 1 };
  }

  // Сценарий 2: У кого-то уже есть род
  let c1 = p1.clanName || "";
  let w1 = p1.clanWeight || 0;
  let c2 = p2.clanName || "";
  let w2 = p2.clanWeight || 0;

  let dom = w1 >= w2 ? { name: c1, weight: w1 } : { name: c2, weight: w2 };
  let rec = w1 < w2 ? { name: c1, weight: w1 } : { name: c2, weight: w2 };

  // Если один из родителей без рода, он считается рецессивным с весом 0
  const roll = Math.random() * 100;

  if (roll < 5) {
    // Шанс на мутацию (новые буквы) (5%)
    return { name: getRandomChar(consonants).toUpperCase() + getRandomChar(vowels), weight: 1 };
  }

  if (roll < 14) {
    // Шанс на гибрид Согл(D) + Глас(R) (9%)
    const c = dom.name ? dom.name[0] : getRandomChar(consonants).toUpperCase();
    const v = rec.name ? rec.name[1] : getRandomChar(vowels);
    return { name: c + v, weight: Math.floor(dom.weight / 2) + 1 };
  }

  if (roll < 15) {
    // Шанс на смену гласной в доминирующем роду (1%)
    const c = dom.name ? dom.name[0] : getRandomChar(consonants).toUpperCase();
    return { name: c + getRandomChar(vowels), weight: dom.weight };
  }

  // Стандартная рулетка (85%)
  const pool = dom.weight + rec.weight;
  const dThreshold = dom.weight + 0.5 * rec.weight;
  const pick = Math.random() * (pool || 1);

  if (pick < dThreshold && dom.name) {
    return { name: dom.name, weight: dom.weight + 1 };
  } else if (rec.name) {
    return { name: rec.name, weight: rec.weight + 1 };
  }

  // Фолбэк
  return { name: dom.name || rec.name || (getRandomChar(consonants).toUpperCase() + getRandomChar(vowels)), weight: 1 };
}

/**
 * Создание новой пешки на основе двух родителей
 * @param {Pawn} p1 - Первый родитель
 * @param {Pawn} p2 - Второй родитель
 * @param {number} width - Ширина поля
 * @param {number} height - Высота поля
 */
function spawnChild(p1, p2, width, height) {
  // 1. Поколение
  const childGen = Math.max(p1.generation || 1, p2.generation || 1) + 1;

  // 2. Генетика Рода/Имени
  const clanData = breedClans(p1, p2);

  // 3. Цвет (HSL генетика)
  const childColor = breedColors(p1.baseColor, p2.baseColor);

  // 4. Создание объекта
  // Pawn(canvasWidth, canvasHeight, age, parent1, parent2, gen, personalName, clanName, clanWeight, inheritedColor)
  const child = new Pawn(width, height, 0, p1, p2, childGen, null, clanData.name, clanData.weight, childColor);

  child.x = p1.x + (Math.random() - 0.5) * 20;
  child.y = p1.y + (Math.random() - 0.5) * 20;

  pawns.push(child);
  totalPawnsCreated++;
  maxGeneration = Math.max(maxGeneration, child.generation);
  maxClanWeight = Math.max(maxClanWeight, child.clanWeight);
  p1.children.push(child);
  p2.children.push(child);
}

/**
 * Генетическое смешивание цветов родителей (HSL-наследование)
 * @param {string} c1Str - RGB цвет первого родителя
 * @param {string} c2Str - RGB цвет второго родителя
 */
function breedColors(c1Str, c2Str) {
  const rgb1 = parseRGB(c1Str);
  const rgb2 = parseRGB(c2Str);

  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

  // Наследование Тона (Hue): 45% папа, 45% мама, 10% среднее
  let h;
  const rand = Math.random();
  if (rand < 0.45) h = hsl1.h;
  else if (rand < 0.90) h = hsl2.h;
  else h = (hsl1.h + hsl2.h) / 2;

  // Мутация тона (+/- 10 градусов)
  h += (Math.random() - 0.5) * 20;
  h = (h + 360) % 360;

  // Насыщенность и Яркость (берем среднее)
  let s = (hsl1.s + hsl2.s) / 2;
  let l = (hsl1.l + hsl2.l) / 2;

  // Если насыщенность падает ниже 60%, подтягиваем до 80-90%
  if (s < 60) {
    s = 80 + Math.random() * 10;
  }

  // Защита от слишком темных/светлых (чтобы цвета были видимы)
  if (l < 40) l = 40 + Math.random() * 15;
  if (l > 75) l = 60 + Math.random() * 15;

  const finalRgb = hslToRgb(h, s, l);
  return `rgb(${finalRgb.r}, ${finalRgb.g}, ${finalRgb.b})`;
}

/**
 * Парсинг строки RGB в объект компонентов
 * @param {string} rgbStr 
 */
function parseRGB(rgbStr) {
  const match = rgbStr.match(/\d+/g);
  if (!match) return { r: 128, g: 128, b: 128 };
  return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
}

/**
 * Перевод RGB в HSL для более точной генетики цветов
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Перевод HSL обратно в RGB для отрисовки
 */
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
