class Pawn {
  constructor(canvasWidth, canvasHeight, age = 0, parent1 = null, parent2 = null, gen = 1, personalName = null, clanName = "", clanWeight = 0, inheritedColor = null, temperament = null) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 6;

    // Родители (как объекты, если есть)
    this.parent1Obj = parent1;
    this.parent2Obj = parent2;
    // Имена родителей для индикации (даже если объектов уже нет)
    this.parent1Name = parent1 ? parent1.name : (typeof parent1 === 'string' ? parent1 : "—");
    this.parent2Name = parent2 ? parent2.name : (typeof parent2 === 'string' ? parent2 : "—");

    this.baseColor = inheritedColor || this.getRandomColor();
    this.color = this.baseColor;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;

    const currentTime = (typeof gameTime !== 'undefined') ? gameTime : 0;
    const dayDur = (typeof CONFIG !== 'undefined' && CONFIG.DAY_DURATION) ? CONFIG.DAY_DURATION : 5000;

    // Вычисляем время рождения для синхронизации с глобальным таймером
    this.birthTime = currentTime - age * dayDur;
    this.ageDays = age;
    this.lastActionDay = Math.floor(this.ageDays); // Для отслеживания ежедневных событий

    this.generation = gen;
    this.personalName = personalName || this.generatePersonalName();
    this.clanName = clanName || "";
    this.clanWeight = clanWeight || 0;

    // --- ТЕМПЕРАМЕНТ ---
    const types = ["choleric", "sanguine", "phlegmatic", "melancholic"];
    this.temperament = temperament || types[Math.floor(Math.random() * types.length)];

    // Сдвиг жизни для Сангвиников (+2 дня взрослости)
    this.lifespanBonus = (this.temperament === "sanguine") ? 2 : 0;
    // Сдвиг размера для Меланхоликов
    this.sizeOffset = (this.temperament === "melancholic") ? -1 : 0;

    // Итоговое имя: Ву'Кири или просто Кэма (для 1-го поколения)
    if (this.clanName) {
      this.name = `${this.clanName}'${this.personalName}`;
    } else {
      this.name = this.personalName;
    }

    this.partner = null; // Текущий спутник жизни
    this.children = []; // Список потомков
  }

  /**
   * Генерация уникального личного имени по паттерну CVCV (Согласная-Гласная-Согласная-Гласная)
   */
  generatePersonalName() {
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const vowels = "aeiou";
    const getRandomChar = (str) => str[Math.floor(Math.random() * str.length)];

    const c1 = getRandomChar(consonants).toUpperCase();
    const v1 = getRandomChar(vowels);
    const c2 = getRandomChar(consonants);
    const v2 = getRandomChar(vowels);

    return c1 + v1 + c2 + v2;
  }

  /**
   * Генерация случайного цвета для основателей
   */
  getRandomColor() {
    const r = Math.floor(Math.random() * 200 + 55);
    const g = Math.floor(Math.random() * 200 + 55);
    const b = Math.floor(Math.random() * 200 + 55);
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Возвращает имена родителей в виде строки
   */
  getParentNames() {
    return `${this.parent1Name}, ${this.parent2Name}`;
  }

  /**
   * Возвращает список имен детей через запятую
   */
  getChildrenNames() {
    if (this.children.length === 0) return "Нет";
    return this.children.map(c => c.name).join(", ");
  }

  /**
   * Вычисляет ID клетки навигационной сетки (например, "42")
   */
  getCellId(width, height) {
    const mapSide = (typeof CONFIG !== 'undefined' && CONFIG.MAP_SIDE) ? CONFIG.MAP_SIDE : 9;
    const zoneSide = mapSide / 3;
    const cellW = width / mapSide;
    const cellH = height / mapSide;
    const c = Math.floor(this.x / cellW);
    const r = Math.floor(this.y / cellH);
    if (c < 0 || c >= mapSide || r < 0 || r >= mapSide) return "??";
    const macroC = Math.floor(c / zoneSide);
    const macroR = Math.floor(r / zoneSide);
    const macroId = (macroR * 3) + macroC + 1;
    const localC = c % zoneSide;
    const localR = r % zoneSide;
    const microId = (localR * 3) + localC + 1;
    return `${macroId}${microId}`;
  }

  update(width, height, currentDay, light) {
    // Считаем возраст для изменения скорости и стадий
    // Используем birthTime
    const currentTime = (typeof gameTime !== 'undefined') ? gameTime : 0;
    const dayDur = (typeof CONFIG !== 'undefined' && CONFIG.DAY_DURATION) ? CONFIG.DAY_DURATION : 5000;

    this.ageDays = (currentTime - this.birthTime) / dayDur;

    // Сброс флагов и цвета по умолчанию (если живой)
    this.shouldRemove = false;

    // --- ЖИЗНЕННЫЕ ЦИКЛЫ И СМЕРТЬ ---
    if (this.ageDays < 6) {
      // МОЛОДОЙ (0-6 дней): маленький размер
      this.size = 3 + this.sizeOffset;
      this.color = this.baseColor;
      this.move(width, height, light, "young");

    } else if (this.ageDays < (15 + this.lifespanBonus)) {
      // ВЗРОСЛЫЙ (6-15+ дней): стандартный размер и скорость
      this.size = 6 + this.sizeOffset;
      this.color = this.baseColor;
      this.move(width, height, light, "adult");

    } else if (this.ageDays < (21 + this.lifespanBonus)) {
      // СТАРЕЙШИНА (15-21+ день): уменьшение размера и замедление
      this.size = 5 + this.sizeOffset;
      this.color = this.baseColor;
      this.move(width, height, light, "old");

    } else {
      // МЕРТВЕЦ (21+ дней): чернеет и исчезает через день
      this.size = 5 + this.sizeOffset;
      this.color = "#000000";
      if (this.ageDays >= 22) {
        this.shouldRemove = true;
      }
    }

    // --- ЕЖЕДНЕВНАЯ ПРОВЕРКА СОЦИАЛКИ ---
    const day = Math.floor(this.ageDays);
    if (day > this.lastActionDay && !this.shouldRemove && this.color !== "#000000") {
      this.lastActionDay = day;
      if (typeof handleDailyPawnLogic === 'function') {
        handleDailyPawnLogic(this, width, height);
      }
    }
  }

  /**
   * Логика перемещения с учетом возраста, освещения и темперамента
   */
  move(width, height, light, stage) {
    let speedMult = 1.0;
    if (stage === "young") speedMult = 1.2;
    if (stage === "old") speedMult = 0.5;

    // Влияние темперамента на скорость
    let tempSpeed = 0;
    let changeDirChance = 0.005; // Базовый шанс смены направления (снижен с 0.01)

    if (this.temperament === "choleric") {
      // Стабильно высокая скорость для холериков вместо резких скачков
      tempSpeed = 1.5;
      changeDirChance = 0.02; // Снижено с 0.05
    } else if (this.temperament === "sanguine") {
      tempSpeed = 0.5; // Сглажено
      changeDirChance = 0.002; // Снижено с 0.005
    } else if (this.temperament === "phlegmatic") {
      tempSpeed = -0.5; // Сглажено
      changeDirChance = 0.0005; // Снижено с 0.001
    } else if (this.temperament === "melancholic") {
      tempSpeed = 0; // Меланхолики ходят со стандартной скоростью
      changeDirChance = 0.005; // Снижено
    }

    // Ночной режим: снижение активности в зависимости от света
    let nightReduction = 0.3 + light * 0.7;
    // Холерик почти не спит ночью (меньше замедляется)
    if (this.temperament === "choleric") {
      nightReduction = 0.7 + light * 0.3;
    }

    this.x += (this.vx + (this.vx > 0 ? tempSpeed * 0.05 : -tempSpeed * 0.05)) * speedMult * nightReduction;
    this.y += (this.vy + (this.vy > 0 ? tempSpeed * 0.05 : -tempSpeed * 0.05)) * speedMult * nightReduction;

    // Случайная смена направления на основе темперамента
    if (Math.random() < changeDirChance) {
      let angle = Math.random() * Math.PI * 2;
      let mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(angle) * mag;
      this.vy = Math.sin(angle) * mag;
    }

    // Столкновение с границами мира
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  /**
   * Отрисовка пешки на холсте
   */
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Обычная обводка
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.closePath();
  }
}
