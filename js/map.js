let worldMap = {};
let backgroundCache = null;

const CLIMATE_ANCHORS = [
  { r: 1, c: 1, color: "rgba(200, 220, 255, 0.7)", rgb: [200, 220, 255], temp: -20, },
  { r: 8, c: 8, color: "rgba(255, 150, 50, 0.7)", rgb: [255, 150, 50], temp: 45 },
  { r: 4, c: 4, color: "rgba(2, 211, 12, 0.4)", rgb: [34, 139, 34], temp: 20 },
  { r: 9, c: 1, color: "rgba(21, 24, 172, 0.5)", rgb: [0, 105, 148], temp: 5 },
  { r: 1, c: 8, color: "rgba(240, 50, 37, 0.7)", rgb: [240, 50, 40], temp: 10 },
];

function initMap(width, height) {
  const canvasW = width || window.innerWidth;
  const canvasH = height || window.innerHeight;

  worldMap = {};

  // 1. Сначала считаем логику (температуру и цвета районов)
  for (let rG = 0; rG < 10; rG++) {
    for (let cG = 0; cG < 10; cG++) {
      let totalWeight = 0;
      let fRGB = [0, 0, 0];
      let fTemp = 0;

      CLIMATE_ANCHORS.forEach((a) => {
        let dist = Math.sqrt(Math.pow(rG - a.r, 2) + Math.pow(cG - a.c, 2));
        let weight = 1 / (Math.pow(dist, 2) + 1); // Тот самый вес 'weight'

        totalWeight += weight;
        fRGB[0] += a.rgb[0] * weight;
        fRGB[1] += a.rgb[1] * weight;
        fRGB[2] += a.rgb[2] * weight;
        fTemp += a.temp * weight;
      });

      let id = `${rG}${cG}`;
      worldMap[id] = {
        temp: fTemp / totalWeight,
        color: `rgb(${fRGB[0] / totalWeight},${fRGB[1] / totalWeight},${
          fRGB[2] / totalWeight
        })`,
      };
    }
  }

  // 2. Теперь рисуем красивый фон в кэш
  backgroundCache = document.createElement("canvas");
  backgroundCache.width = canvasW;
  backgroundCache.height = canvasH;
  const bCtx = backgroundCache.getContext("2d");

  bCtx.fillStyle = "#050505";
  bCtx.fillRect(0, 0, canvasW, canvasH);
  bCtx.globalCompositeOperation = "screen";

  CLIMATE_ANCHORS.forEach((a) => {
    const sX = (a.c / 9) * canvasW;
    const sY = (a.r / 9) * canvasH;
    const radius = canvasW * 0.7;

    let g = bCtx.createRadialGradient(
      sX,
      sY,
      0.1,
      sX,
      sY,
      radius > 0 ? radius : 100
    );
    g.addColorStop(0, a.color);
    g.addColorStop(1, "transparent");

    bCtx.fillStyle = g;
    bCtx.fillRect(0, 0, canvasW, canvasH);
  });

  console.log("Карта ожила! ~");
}

function drawGrid(ctx, w, h) {
  if (backgroundCache) ctx.drawImage(backgroundCache, 0, 0);

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    ctx.moveTo((i * w) / 10, 0);
    ctx.lineTo((i * w) / 10, h);
    ctx.moveTo(0, (i * h) / 10);
    ctx.lineTo(w, (i * h) / 10);
  }
  ctx.stroke();
}
