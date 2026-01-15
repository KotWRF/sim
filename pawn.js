class Pawn {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 4;
    this.baseColor = this.getRandomColor();
    this.color = this.baseColor;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;

    this.hp = 100;
    this.ageDays = 0;
  }

  getRandomColor() { 
    const r = Math.floor(Math.random() * 200 + 55);
    const g = Math.floor(Math.random() * 200 + 55);
    const b = Math.floor(Math.random() * 200 + 55);
    return `rgb(${r},${g},${b})`;
  }

  update(width, height, currentDay, light) {
    // Считаем возраст для изменения скорости
    this.ageDays = gameTime / CONFIG.DAY_DURATION;

    let stage = "adult";
    if (this.ageDays < 5) stage = "young";
    else if (this.ageDays >= 10) stage = "old";

    // Просто двигаем пешку
    this.move(width, height, light, stage);
  }

  move(width, height, light, stage) {
    let speedMult = 1.0;
    if (stage === "young") speedMult = 1.2;
    if (stage === "old") speedMult = 0.5;

    // Влияние времени суток (ночью ползают)
    let timeMult = 0.3 + light * 0.7;

    this.x += this.vx * speedMult * timeMult;
    this.y += this.vy * speedMult * timeMult;

    // Отскок от краев
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Обычная обводка
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.closePath();
  }
}
