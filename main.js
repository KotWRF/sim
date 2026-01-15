const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let pawns = [];
const INITIAL_COUNT = 50;

// ОСТАВЛЯЕМ ТОЛЬКО ЭТУ ВЕРСИЮ РЕЗАЙЗА
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
  pawns.push(new Pawn(canvas.width, canvas.height));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Если у тебя есть эти функции (updateTime и т.д.), оставляем
  if (typeof updateTime === "function") updateTime();

  drawGrid(ctx, canvas.width, canvas.height);

  // Проверка на существование CONFIG и переменных времени
  let currentDay =
    typeof gameTime !== "undefined" && typeof CONFIG !== "undefined"
      ? Math.floor(gameTime / CONFIG.DAY_DURATION)
      : 0;
  let light = typeof getDayLight === "function" ? getDayLight() : 1;

  pawns.forEach((p) => {
    // Передаем worldMap (она уже создана в initMap внутри resize)
    p.update(canvas.width, canvas.height, currentDay, light);
    p.draw(ctx);
  });

  if (typeof drawOverlay === "function")
    drawOverlay(ctx, canvas.width, canvas.height);
  if (typeof updateHUD === "function") updateHUD();

  requestAnimationFrame(draw);
}

// Запуск
draw();

// Если инспектор готов — запускаем
if (typeof initInspector === "function") {
  initInspector(pawns, canvas);
}
