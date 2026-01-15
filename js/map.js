let worldMap = {};
let backgroundCache = null;

const CLIMATE_ANCHORS = [
  { r: 1, c: 1, color: "rgba(200, 220, 255, 0.7)", rgb: [200, 220, 255] },
  { r: 8, c: 8, color: "rgba(255, 150, 50, 0.7)", rgb: [255, 150, 50] },
  { r: 4, c: 4, color: "rgba(2, 211, 12, 0.4)", rgb: [34, 139, 34] },
  { r: 9, c: 1, color: "rgba(21, 24, 172, 0.5)", rgb: [0, 105, 148] },
  { r: 1, c: 8, color: "rgba(240, 50, 37, 0.7)", rgb: [240, 50, 40] },
];

function initMap(width, height) {
  const canvasW = width || window.innerWidth;
  const canvasH = height || window.innerHeight;

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

function drawBackground(ctx) {
  if (backgroundCache) {
    ctx.drawImage(backgroundCache, 0, 0);
  }
}

function drawGridLines(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  const mapSide = (typeof CONFIG !== 'undefined' && CONFIG.MAP_SIDE) ? CONFIG.MAP_SIDE : 9;

  for (let i = 0; i <= mapSide; i++) {
    // Вертикальные
    ctx.moveTo((i * w) / mapSide, 0);
    ctx.lineTo((i * w) / mapSide, h);
    // Горизонтальные
    ctx.moveTo(0, (i * h) / mapSide);
    ctx.lineTo(w, (i * h) / mapSide);
  }
  ctx.stroke();
  ctx.restore();
}
