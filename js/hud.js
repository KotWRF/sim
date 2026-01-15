let selectedPawn = null;
const inspector = document.getElementById("inspector");

function initInspector(pawns, canvas) {
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    selectedPawn = pawns.find((p) => {
      const dist = Math.sqrt((p.x - mouseX) ** 2 + (p.y - mouseY) ** 2);
      return dist < p.size + 15;
    });
  });
}

function updateHUD() {
  if (!selectedPawn) {
    inspector.style.display = "none";
    return;
  }

  inspector.style.display = "block";

  const margin = 40;
  const inspectorWidth = 240;
  const inspectorHeight = 180; // Чуть увеличил запас под текст

  // ЛОГИКА "ГИБКОГО" ПОЗИЦИОНИРОВАНИЯ
  // По умолчанию стремимся в левый угол
  let targetSide = "left";

  // Если пешка заходит в зону левого угла — прыгаем вправо
  if (
    selectedPawn.x < inspectorWidth + margin &&
    selectedPawn.y < inspectorHeight + margin
  ) {
    targetSide = "right";
  }

  // Применяем стили в зависимости от выбора стороны
  if (targetSide === "left") {
    inspector.style.left = "20px";
    inspector.style.right = "auto";
  } else {
    inspector.style.left = "auto";
    inspector.style.right = "20px";
  }
  inspector.style.top = "20px";

  // РАСЧЕТ КЛЕТКИ И ОБНОВЛЕНИЕ ТЕКСТА
  let r = Math.floor((selectedPawn.y / window.innerHeight) * 10);
  let c = Math.floor((selectedPawn.x / window.innerWidth) * 10);

  // Ограничиваем индексы от 0 до 9 на случай вылета пешки за экран
  r = Math.max(0, Math.min(9, r));
  c = Math.max(0, Math.min(9, c));

  document.getElementById("inspector-content").innerHTML = `
      <div style="text-align: center; font-size: 0.8em; color: #aaa; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px; font-family: monospace;">
        КЛЕТКА: ${r}-${c}
      </div>
      
      <div style="display:flex; align-items:center; gap:15px; margin-bottom:12px;">
          <div style="
            width: 26px; 
            height: 26px; 
            border-radius: 50%; 
            background: ${selectedPawn.baseColor}; 
            border: 2px solid white;
            box-shadow: 0 0 12px ${selectedPawn.baseColor};
          "></div>
          
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 0.9em; font-weight: bold; color: #fff;">Объект №${pawns.indexOf(
              selectedPawn
            )}</span>
          </div>
      </div>

      <div style="font-size: 0.9em; color: #ddd; line-height: 1.5;">
        <p style="margin: 4px 0;">⏳ Возраст: <span style="color: #fff;">${Math.floor(
          selectedPawn.ageDays
        )} дн.</span></p>
        <p style="margin: 4px 0;">🏷️ Статус: <span style="color: #fff;">${
          selectedPawn.ageDays < 5
            ? "Молодой"
            : selectedPawn.ageDays < 10
            ? "Взрослый"
            : "Старейшина"
        }</span></p>
      </div>
  `;
}
