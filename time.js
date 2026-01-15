// time.js
let gameTime = 0; // Секунды от начала игры

function updateTime() {
    gameTime += 1 / 60; // Прибавляем время (при 60 FPS)
}

function getDayLight() {
    let cycle = gameTime % CONFIG.DAY_DURATION; // 0 - 60
    
    if (cycle < 15) {
        // УТРО: от 0 до 1 (0 / 15 ... 15 / 15)
        return cycle / 15;
    } else if (cycle < 30) {
        // ДЕНЬ: всегда 1
        return 1;
    } else if (cycle < 45) {
        // ВЕЧЕР: от 1 до 0
        return 1 - ((cycle - 30) / 15);
    } else {
        // НОЧЬ: всегда 0
        return 0;
    }
}

function drawOverlay(ctx, width, height) {
    let light = getDayLight();
    
    // Ночной фильтр: чем меньше light, тем чернее экран
    // Мы накладываем черный прямоугольник с разной прозрачностью
    let nightOpacity = 0.8 * (1 - light); // Максимальная темнота 0.8
    
    ctx.fillStyle = `rgba(0, 0, 10, ${nightOpacity})`; // Темно-синий оттенок ночи
    ctx.fillRect(0, 0, width, height);
}


function getGameClock() {
    let cycle = gameTime % CONFIG.DAY_DURATION;
    let totalMinutes = (cycle / CONFIG.DAY_DURATION) * 24 * 60;
    let hours = Math.floor(totalMinutes / 60);
    let minutes = Math.floor(totalMinutes % 60);
    
    // Возвращает строку типа "14:05"
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}